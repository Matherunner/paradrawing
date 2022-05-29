import React, { CSSProperties, PropsWithChildren } from 'react';
import styles from './App.module.css';
import { Drawing, EventKind, ObjectKind, StateChangeListener, ToolKind } from './canvas';

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

interface ControllerState {
  currentToolType: ToolKind;
  commands: CommandAction[];
}

const initialControllerState = {
  currentToolType: ToolKind.Pen,
  commands: [],
}

type CommandAction =
  { type: 'commitObject', object: Object }

type ControllerAction =
  { type: 'selectTool', toolType: ToolKind } |
  { type: 'addTemporaryNode', point: Vec2D } |
  CommandAction

function controllerReducer(state: ControllerState, action: ControllerAction): ControllerState {
  switch (action.type) {
  case 'selectTool': {
    return {
      ...state,
      currentToolType: action.toolType,
    }
  }

  default:
    return state;
  }
}

interface ToolbarProps {
  state: ControllerState,
}

function toolTypeToString(type: ToolKind): string {
  switch (type) {
  case ToolKind.Selector:
    return "Selector"
  case ToolKind.Pen:
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

interface DrawingWrapperProps {
  dispatch: React.Dispatch<ControllerAction>,
}

function DrawingWrapper(props: PropsWithChildren<DrawingWrapperProps>) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [, setChangeCounter] = React.useState(0);

  const objRef = React.useRef<Drawing>();
  if (!objRef.current) {
    objRef.current = new Drawing();
  }
  const drawingRef = objRef.current;

  const updateGlobalState = () => {
    props.dispatch({
      type: 'selectTool',
      toolType: drawingRef.getState().tool.kind,
    })
  }

  React.useEffect(() => {
    const listener: StateChangeListener = (e) => {
      console.log('got a drawing state change', JSON.parse(JSON.stringify(e)))

      setChangeCounter((s) => {
        return s + 1;
      })

      updateGlobalState();
    }

    drawingRef.addStateChangeListener(listener);
    return () => {
      drawingRef.removeStateChangeListener(listener);
    }
  }, [drawingRef])

  React.useEffect(() => {
    updateGlobalState();
  }, [])

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      drawingRef.sendEvent({
        kind: EventKind.KeyDown,
        key: e.key,
      })
    }

    const onKeyUp = (e: KeyboardEvent) => {
      drawingRef.sendEvent({
        kind: EventKind.KeyUp,
        key: e.key,
      })
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp)
    }
  })

  const onMouseDown: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (!containerRef.current) {
      return;
    }

    const { offsetLeft, offsetTop } = containerRef.current

    drawingRef.sendEvent({
      kind: EventKind.MouseDown,
      point: [e.clientX - offsetLeft, e.clientY - offsetTop],
    })

    e.preventDefault();
  };

  const onMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (!containerRef.current) {
      return;
    }

    const { offsetLeft, offsetTop } = containerRef.current;

    drawingRef.sendEvent({
      kind: EventKind.MouseMove,
      point: [e.clientX - offsetLeft, e.clientY - offsetTop],
    })

    e.preventDefault();
  }

  const svgs = [];

  const tool = drawingRef.getState().tool;
  if (tool.kind === ToolKind.Pen) {
    const nextObj = tool.tempObjectMap[tool.nextObjectID];
    if (nextObj) {
      switch (nextObj.kind) {
      case ObjectKind.Path:
        for (const lineObjectID of nextObj.lines) {
          const lineObj = tool.tempObjectMap[lineObjectID];
          if (lineObj?.kind === ObjectKind.Line) {
            const point1Obj = tool.tempObjectMap[lineObj.point1];
            const point2Obj = tool.tempObjectMap[lineObj.point2];
            if (point1Obj && point2Obj && point1Obj.kind === ObjectKind.Node && point2Obj.kind === ObjectKind.Node) {
              svgs.push(<line key={lineObj.id} x1={point1Obj.point[0]} y1={point1Obj.point[1]} x2={point2Obj.point[0]} y2={point2Obj.point[1]} strokeWidth={1} stroke="black" />)
            }
          }
        }  
        for (const pointObjectID of nextObj.points) {
          const pointObj = tool.tempObjectMap[pointObjectID];
          if (pointObj?.kind === ObjectKind.Node) {
            svgs.push(<circle key={pointObjectID} cx={pointObj.point[0]} cy={pointObj.point[1]} r={3} fill="none" strokeWidth={1} stroke="black" />);
          }
        }
        break;
      }
    }
  }

  return (
    <div ref={containerRef} style={{ flex: 1 }}>
      <svg
        style={{ flex: 1 }}
        onMouseDown={onMouseDown}
        // onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        // onDoubleClick={onDoubleClick}
        width="100%"
        height="100%"
        preserveAspectRatio='none'
        xmlns="http://www.w3.org/2000/svg"
      >
        {svgs}
      </svg>
    </div>
  );
}

interface CanvasProps {
  style?: CSSProperties;
}

function Canvas(props: PropsWithChildren<CanvasProps>) {
  const [state, dispatch] = React.useReducer(controllerReducer, initialControllerState);

  return (
    <div style={{ ...props.style, flexDirection: 'column', display: 'flex' }}>
      <Toolbar state={state} />
      <div style={{ flex: 1, flexDirection: 'row', display: 'flex' }}>
        <div style={{ width: 300, backgroundColor: 'lightblue' }}>
          <CommandList state={state} />
        </div>
        <DrawingWrapper dispatch={dispatch} />
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
