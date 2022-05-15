import React, { CSSProperties, PropsWithChildren } from 'react';
import styles from './App.module.css';

const enum ToolType {
  Selector,
  Pen,
}

interface ToolboxCanvasProps {
  state: ControllerState;
  mouseX: number;
  mouseY: number;
}

function pathCommandsFromObject(object: Object): string {
  let pathCmds = '';
  switch (object.type) {
  case ObjectType.Path:
    for (let i = 0; i < object.nodes.length; ++i) {
      const node = object.nodes[i];
      if (!i) {
        pathCmds += `M${node.point.x} ${node.point.y}`;
      } else {
        pathCmds += `L${node.point.x} ${node.point.y}`;
      }
    }
  }
  return pathCmds;
}

function ToolboxCanvas(props: PropsWithChildren<ToolboxCanvasProps>) {
  switch (props.state.currentToolType) {
    case ToolType.Pen:
      let pathCmds = '';
      const { temporaryPath } = props.state.penTool;
      if (temporaryPath?.type === ObjectType.Path) {
        pathCmds = pathCommandsFromObject(temporaryPath);
        if (temporaryPath.nodes.length) {
          pathCmds += `L${props.mouseX} ${props.mouseY}`
        }
      }

      return (
        <path d={pathCmds} stroke='black' strokeWidth={1} fill='none' />
      )
    default:
      return null;
  }
}

interface DataCanvasProps {
  state: ControllerState;
}

function DataCanvas(props: PropsWithChildren<DataCanvasProps>) {
  const elems = [];

  const { objects } = props.state.canvas;
  for (const object of objects) {
    const cmd = pathCommandsFromObject(object);
    elems.push(<path key={object.id} d={cmd} stroke='black' strokeWidth={1} fill='none' />);
  }

  return (
    <>
      {elems}
    </>
  );
}

interface Point {
  x: number;
  y: number;
}

type Node = {
  point: Point;
  leftControlPoint: number | null;
  rightControlPoint: number | null;
}

enum ObjectType {
  Circle,
  Path,
}

type Object = {
  type: ObjectType.Path;
  id: number,
  nodes: Node[];
} | {
  type: ObjectType.Circle;
  id: number,
  radius: number;
  centre: Point;
}

interface PenToolState {
  temporaryPath?: Object;
}

interface CanvasState {
  objectID: number,
  objects: Object[],
}

interface ControllerState {
  currentToolType: ToolType;
  canvas: CanvasState,
  penTool: PenToolState;
  commands: CommandAction[];
}

const initialControllerState = {
  currentToolType: ToolType.Pen,
  canvas: {
    objectID: 0,
    objects: [],
  },
  penTool: {},
  commands: [],
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

type CommandAction =
  { type: 'commitObject', object: Object }

type ControllerAction =
  { type: 'selectTool', toolType: ToolType } |
  { type: 'addTemporaryNode', point: Point } |
  CommandAction

function controllerReducer(state: ControllerState, action: ControllerAction): ControllerState {
  switch (action.type) {
  case 'selectTool': {
    let { penTool } = state;
    switch (action.toolType) {
    case ToolType.Pen:
      break;
    case ToolType.Selector:
      penTool = {}
      break;
    }

    return {
      ...state,
      penTool,
      currentToolType: action.toolType,
    }
  }

  case 'addTemporaryNode': {
    let { temporaryPath } = state.penTool;

    let objectID = state.canvas.objectID;
    if (!temporaryPath) {
      temporaryPath = {
        // TODO: assume always path for now
        type: ObjectType.Path,
        id: objectID + 1,
        nodes: [],
      }
    }

    if (temporaryPath.type === ObjectType.Path) {
      const { point: lastPoint } = temporaryPath.nodes[temporaryPath.nodes.length - 1] || {
        point: {
          x: NaN,
          y: NaN,
        },
      };
      if (!samePoint(lastPoint, action.point)) {
        temporaryPath.nodes = [
          ...temporaryPath.nodes,
          {
            point: action.point,
            leftControlPoint: null,
            rightControlPoint: null,
          }
        ]
      }
    }

    return {
      ...state,
      penTool: {
        ...state.penTool,
        temporaryPath,
      }
    };
  }

  case 'commitObject': {
    const objectID = state.canvas.objectID + 1;
    if (action.object.id !== objectID) {
      return state
    }

    return {
      ...state,
      currentToolType: ToolType.Selector,
      penTool: {},
      canvas: {
        ...state.canvas,
        objects: [
          ...state.canvas.objects,
          action.object,
        ],
        objectID,
      },
      commands: [
        ...state.commands,
        action,
      ]
    }
  }
  }
}

type ToolInput =
  { type: 'mouseDown', point: Point } |
  { type: 'doubleClick', point: Point }

function runTool(state: ControllerState, dispatch: React.Dispatch<ControllerAction>, input: ToolInput) {
  switch (state.currentToolType) {
  case ToolType.Pen:
    switch (input.type) {
    case 'mouseDown':
      dispatch({
        type: 'addTemporaryNode',
        point: {
          x: input.point.x,
          y: input.point.y,
        }
      })
      break;

    case 'doubleClick':
      const { temporaryPath } = state.penTool;
      if (!temporaryPath) {
        return;
      }

      let action: ControllerAction | undefined;
      if (temporaryPath.type === ObjectType.Path) {
        action = {
          type: 'commitObject',
          object: temporaryPath,
        }
      }
      if (action) {
        dispatch(action);
      }
      break;
    }
    break;

  case ToolType.Selector:
    break;
  }
}

interface ToolbarProps {
  state: ControllerState,
}

function toolTypeToString(type: ToolType): string {
  switch (type) {
  case ToolType.Selector:
    return "Selector"
  case ToolType.Pen:
    return "Pen"
  }
}

function Toolbar(props: PropsWithChildren<ToolbarProps>) {
  const toolboxName = toolTypeToString(props.state.currentToolType);

  return (
    <div style={{ height: '2em', width: '100%', backgroundColor: '#eeeeff' }}>
      <span>{toolboxName}</span>
    </div>
  );
}

interface CanvasProps {
  style?: CSSProperties;
}

function Canvas(props: PropsWithChildren<CanvasProps>) {
  const [state, dispatch] = React.useReducer(controllerReducer, initialControllerState);

  const containerRef = React.useRef<HTMLDivElement>(null);

  const [mousePoint, setMousePoint] = React.useState({ x: 0, y: 0 });

  const onMouseDown: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (!containerRef.current) {
      return;
    }

    const { offsetLeft, offsetTop } = containerRef.current

    runTool(state, dispatch, {
      type: 'mouseDown',
      point: {
        x: e.clientX - offsetLeft,
        y: e.clientY - offsetTop,
      }
    })

    e.preventDefault();
  };

  const onMouseUp: React.MouseEventHandler<SVGSVGElement> = (e) => {

    e.preventDefault();
  };

  const onMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (!containerRef.current) {
      return;
    }

    // This method of getting the position only works if the none of the ancestor is absolutely positioned.
    const { offsetLeft, offsetTop } = containerRef.current;

    setMousePoint({
      x: e.clientX - offsetLeft,
      y: e.clientY - offsetTop,
    });

    e.preventDefault();
  }

  const onDoubleClick: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (!containerRef.current) {
      return;
    }

    const { offsetLeft, offsetTop } = containerRef.current;

    runTool(state, dispatch, {
      type: 'doubleClick',
      point: {
        x: e.clientX - offsetLeft,
        y: e.clientY - offsetTop,
      }
    })

    e.preventDefault();
  }

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
      case 'p':
        dispatch({
          type: 'selectTool',
          toolType: ToolType.Pen,
        })
        break;

      case 's':
        dispatch({
          type: 'selectTool',
          toolType: ToolType.Selector,
        })
        break;
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {

    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp)
    }
  })

  return (
    <div style={{ ...props.style, flexDirection: 'column', display: 'flex' }}>
      <Toolbar state={state} />
      <div ref={containerRef} style={{ flex: 1 }}>
        <svg
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
          onDoubleClick={onDoubleClick}
          width="100%"
          height="100%"
          preserveAspectRatio='none'
          xmlns="http://www.w3.org/2000/svg"
        >
          <DataCanvas
            state={state}
          />
          <ToolboxCanvas
            state={state}
            mouseX={mousePoint.x}
            mouseY={mousePoint.y}
          />
        </svg>
      </div>
    </div>
  );
}

function App() {
  return (
    <Canvas style={{ height: "100%" }} />
  );
}

export default App;
