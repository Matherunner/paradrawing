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

    case ToolType.Selector:
      const hovered = hoveredObjects(props.state.canvas.objects, {
        x: props.mouseX,
        y: props.mouseY,
      });
      if (hovered) {
        const pathCmds = pathCommandsFromObject(hovered);
        return (
          <path d={pathCmds} stroke='yellow' strokeWidth={1} fill='none' />
        )
      }

      return null;

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

interface Vec2D {
  x: number;
  y: number;
}

function vecSub(a: Vec2D, b: Vec2D): Vec2D {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  }
}

function vecDot(a: Vec2D, b: Vec2D): number {
  return a.x * b.x + a.y * b.y;
}

type Node = {
  point: Vec2D;
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
  centre: Vec2D;
}

function hitLineSegment(a: Node, b: Node, tol: number, mouse: Vec2D): boolean {
  const mouseFromA = vecSub(mouse, a.point);
  const bFromA = vecSub(b.point, a.point);
  const proj = vecDot(mouseFromA, bFromA);
  const normSq = vecDot(bFromA, bFromA);
  if (normSq < 1e-2) {
    return false;
  }

  if (proj <= 0 && proj * proj / normSq >= tol * tol) {
    return false;
  }

  // Equivalent to if (proj / norm(b - a) >= norm(b - a) + tol)
  const tmp1 = proj - normSq;
  if (tmp1 >= 0 && tmp1 * tmp1 / normSq >= tol * tol) {
    return false;
  }

  const mouseFromANormSq = vecDot(mouseFromA, mouseFromA);
  const prepDistSq = mouseFromANormSq - proj * proj / normSq;
  if (prepDistSq > tol * tol) {
    return false;
  }

  return true;
}

function hoveredObjects(objects: Object[], mouse: Vec2D): Object | undefined {
  for (const object of objects) {
    switch (object.type) {
    case ObjectType.Path:
      for (let i = 1; i < object.nodes.length; ++i) {
        const a = object.nodes[i - 1];
        const b = object.nodes[i];
        if (hitLineSegment(a, b, 10, mouse)) {
          // FIXME: always take the first one for now, probably not correct
          return {
            type: ObjectType.Path,
            id: -1,
            nodes: [a, b],
          }
        }
      }

      break;
    case ObjectType.Circle:
      break;
    }
  }
  return undefined;
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

function samePoint(a: Vec2D, b: Vec2D): boolean {
  return a.x === b.x && a.y === b.y;
}

type CommandAction =
  { type: 'commitObject', object: Object }

type ControllerAction =
  { type: 'selectTool', toolType: ToolType } |
  { type: 'addTemporaryNode', point: Vec2D } |
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
  { type: 'mouseDown', point: Vec2D } |
  { type: 'doubleClick', point: Vec2D }

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

interface CommandListProps {
  state: ControllerState;
}

function CommandList(props: PropsWithChildren<CommandListProps>) {
  const items = [];

  for (const cmd of props.state.commands) {
    items.push(<li key={cmd.object.id}><span>{cmd.type}</span></li>);
  }

  return (
    <ul>
      {items}
    </ul>
  )
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
      <div style={{ flex: 1, flexDirection: 'row', display: 'flex' }}>
        <div style={{ width: 300, backgroundColor: 'lightblue' }}>
          <CommandList state={state} />
        </div>
        <div ref={containerRef} style={{ flex: 1 }}>
          <svg
            style={{ flex: 1 }}
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
    </div>
  );
}

function App() {
  return (
    <Canvas style={{ height: "100%" }} />
  );
}

export default App;
