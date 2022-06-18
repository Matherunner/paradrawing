import React, { CSSProperties, MouseEventHandler, PropsWithChildren } from 'react';
import katex from 'katex';
import styles from './App.module.css';
import { Button, DataAction, DataState, Drawing, EventKind, ObjectKind, StateChangeListener, ToolKind } from './canvas';

function domButtonToCanvasButton(button: number): Button | undefined {
  switch (button) {
  case 0:
    return Button.Primary
  case 1:
    return Button.Auxiliary
  case 2:
    return Button.Secondary
  }
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
  commands: string;
}

const initialControllerState = {
  currentToolType: ToolKind.Pen,
  commands: '',
}

type ControllerAction =
  { type: 'selectTool', toolType: ToolKind } |
  { type: 'updateHistory', actions: string }

function controllerReducer(state: ControllerState, action: ControllerAction): ControllerState {
  switch (action.type) {
  case 'selectTool':
    return {
      ...state,
      currentToolType: action.toolType,
    }

  case 'updateHistory':
    return {
      ...state,
      commands: action.actions,
    }

  default:
    return state;
  }
}

interface ToolbarProps {
  state: ControllerState,
  height?: number,
}

function toolTypeToString(type: ToolKind): string {
  switch (type) {
  case ToolKind.Selector:
    return "Selector"
  case ToolKind.Pen:
    return "Pen"
  case ToolKind.Text:
    return "Text"
  }
}

const DEFAULT_TOOLBAR_HEIGHT = 40;

function Toolbar(props: PropsWithChildren<ToolbarProps>) {
  const toolboxName = toolTypeToString(props.state.currentToolType);

  const height = props.height ?? DEFAULT_TOOLBAR_HEIGHT

  return (
    <div style={{ width: '100%', height, backgroundColor: '#eeeeff', pointerEvents: 'auto' }}>
      <span>{toolboxName}</span>
    </div>
  );
}

interface LeftSideBarProps {
  state: ControllerState,
}

function LeftSideBar(props: PropsWithChildren<LeftSideBarProps>) {
  return (
    <div
      style={{
        pointerEvents: 'auto',
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 300,
        backgroundColor: 'lightblue',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CommandList state={props.state} />
    </div>
  )
}

interface RightSideBarProps {
  state: ControllerState,
  drawing: Drawing,
}

function RightSideBar(props: PropsWithChildren<RightSideBarProps>) {
  const [distanceConsValue, setDistanceConsValue] = React.useState('100')

  const [textValue, setTextValue] = React.useState('')

  const [downloadURI, setDownloadURI] = React.useState('')

  const previewSVG = React.useRef<SVGSVGElement>();

  const drawingRef = props.drawing;

  return (
    <div style={{ pointerEvents: 'auto', position: 'absolute', top: 0, right: 0, bottom: 0, width: 300, backgroundColor: 'lightgreen' }}>
      <div>
        <p>Constraint</p>
        <button onClick={(e) => {
          e.preventDefault()
          drawingRef.sendEvent({
            kind: EventKind.AddPerpendicularConstraint,
          })
        }}>Perpendicular</button>
        <button>Parallel</button>
        <button onClick={(e) => {
          e.preventDefault()
          drawingRef.sendEvent({
            kind: EventKind.AddCoincidentConstraint,
          })
        }}>Coincident</button>
        <button onClick={(e) => {
          e.preventDefault()
          drawingRef.sendEvent({
            kind: EventKind.AddHorizontalConstraint,
          })
        }}>Horizontal</button>
        <button onClick={(e) => {
          e.preventDefault()
          drawingRef.sendEvent({
            kind: EventKind.AddVerticalConstraint,
          })
        }}>Vertical</button>
        <input type="text" value={distanceConsValue} onChange={(e) => {
          setDistanceConsValue(e.target.value)
        }} />
        <button onClick={(e) => {
          e.preventDefault()
          drawingRef.sendEvent({
            kind: EventKind.AddDistanceConstraint,
            distance: +distanceConsValue,
          })
        }}>Distance</button>
      </div>

      <div>
        <p>Text</p>
        <button onClick={(e) => {
          e.preventDefault()
          drawingRef.sendEvent({
            kind: EventKind.SelectTextTool
          })
        }}>Add Text</button>
        <input type="text" onChange={(e) => {
          setTextValue(e.target.value)
          drawingRef.sendEvent({
            kind: EventKind.SetTextValue,
            text: e.target.value,
          })
        }} value={textValue} />
      </div>

      <div>
        <p>Export</p>
        <button onClick={(e) => {
          e.preventDefault()
          if (!previewSVG.current) {
            return
          }

          if (downloadURI !== '') {
            URL.revokeObjectURL(downloadURI)
          }

          // TODO: maybe should not hardcode the link
          // The stylesheet is needed for this SVG to work inside an <object> tag in a HTML
          const header = `<?xml version="1.0" encoding="utf-8"?><?xml-stylesheet type="text/css" href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css" ?>`
          const content = `${header}${previewSVG.current.outerHTML}`

          const blob = new Blob([content], { type: 'image/svg+xml' })
          const url = URL.createObjectURL(blob)

          setDownloadURI(url)
        }}>Export as SVG</button>
        <SVGPreview state={drawingRef.getDataState()} onRender={(e) => previewSVG.current = e} fitToContent />
        {
          downloadURI ? <a href={downloadURI} download>Download SVG</a> : null
        }
      </div>
    </div>
  )
}

interface SideBarsProps {
  state: ControllerState,
  drawing: Drawing,
  style?: CSSProperties,
}

function SideBars(props: PropsWithChildren<SideBarsProps>) {
  return (
    <div style={{ position: 'relative', ...props.style }}>
      <LeftSideBar state={props.state} />
      <RightSideBar state={props.state} drawing={props.drawing} />
    </div>
  )
}

interface CommandListProps {
  state: ControllerState;
}

function CommandList(props: PropsWithChildren<CommandListProps>) {
  return (
    <pre style={{ flex: '1 1 0', overflowY: 'auto' }}>
      {props.state.commands}
    </pre>
  )
  // const items = [];

  // for (const cmd of props.state.commands) {
  //   items.push(<li key={cmd.id}><span>#{cmd.id} {cmd.kind}</span></li>);
  // }

  // return (
  //   <ul>
  //     {items}
  //   </ul>
  // )
}

interface SVGPreviewProps {
  state: DataState,
  width?: number,
  height?: number,
  fitToContent?: boolean,
  viewBox?: string,
  overlay?: React.ReactNode,
  onRender?: (svg: SVGSVGElement) => void,
  onMouseDown?: React.MouseEventHandler<SVGSVGElement>,
  onMouseUp?: React.MouseEventHandler<SVGSVGElement>,
  onMouseMove?: React.MouseEventHandler<SVGSVGElement>,
}

function SVGPreview(props: PropsWithChildren<SVGPreviewProps>) {
  const [svgWidth, setSVGWidth] = React.useState(props.width || 0)
  const [svgHeight, setSVGHeight] = React.useState(props.height || 0)
  const [svgViewBox, setSVGViewBox] = React.useState<string>()

  const svgRef = React.useRef<SVGSVGElement>(null)

  React.useEffect(() => {
    if (!props.fitToContent || !svgRef.current) {
      return
    }

    // FIXME: this getBBox will cause a reflow, might create performance issues?
    const bbox = svgRef.current.getBBox({
      fill: true,
      stroke: true,
      markers: true,
    })
    setSVGWidth(bbox.width)
    setSVGHeight(bbox.height)
    setSVGViewBox(`${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`)
  })

  React.useEffect(() => {
    if (!svgRef.current || !props.onRender) {
      return
    }
    props.onRender(svgRef.current)
  }, [props.onRender])

  const svgs = []

  for (const [, v] of Object.entries(props.state.objects)) {
    if (!v) {
      continue;
    }

    switch (v.kind) {
    case ObjectKind.Path: {
      for (const lineID of v.lines) {
        const lineObj = props.state.objects[lineID];
        if (lineObj && lineObj.kind === ObjectKind.Line) {
          const point1Obj = props.state.objects[lineObj.point1];
          const point2Obj = props.state.objects[lineObj.point2];
          if (point1Obj && point2Obj && point1Obj.kind === ObjectKind.Node && point2Obj.kind === ObjectKind.Node) {
            svgs.push(<line key={lineID} x1={point1Obj.point[0]} y1={point1Obj.point[1]} x2={point2Obj.point[0]} y2={point2Obj.point[1]} strokeWidth={1} stroke="black" />);
          }
        }
      }
      break;
    }

    case ObjectKind.Text: {
      const pointObj = props.state.objects[v.point]
      if (pointObj && pointObj.kind === ObjectKind.Node) {
        svgs.push(
          <foreignObject
            key={v.id}
            x={pointObj.point[0]}
            y={pointObj.point[1]}
            width={1}
            height={1}
            overflow="visible"
          >
            <div
              // @ts-expect-error: TS doesn't seem to support xmlns attribute on a DIV
              xmlns="http://www.w3.org/1999/xhtml"
              style={{ whiteSpace: 'nowrap' }}
            >
              <KatexWrapper text={v.text} />
            </div>
          </foreignObject>
        )
      }
      break
    }
    }
  }

  const width = typeof props.width === 'number' ? props.width : svgWidth
  const height = typeof props.height === 'number' ? props.height : svgHeight

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={svgViewBox || props.viewBox}
      preserveAspectRatio='none'
      onMouseDown={props.onMouseDown}
      onMouseMove={props.onMouseMove}
      onMouseUp={props.onMouseUp}
      style={{ display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {svgs}
      {props.overlay}
    </svg>
  )
}

interface KatexWrapperProps {
  text: string,
}

function KatexWrapper(props: PropsWithChildren<KatexWrapperProps>) {
  const elemRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!elemRef.current) {
      return
    }
    katex.render(props.text, elemRef.current)
  }, [props.text])

  return <div ref={elemRef}></div>
}

interface DrawingWrapperProps {
  dispatch: React.Dispatch<ControllerAction>,
  drawing: Drawing,
}

function DrawingWrapper(props: PropsWithChildren<DrawingWrapperProps>) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const svgRef = React.useRef<SVGSVGElement>();

  const [, setChangeCounter] = React.useState(0);

  const drawingRef = props.drawing;

  const updateGlobalState = () => {
    props.dispatch({
      type: 'selectTool',
      toolType: drawingRef.getToolState().tool.kind,
    })

    props.dispatch({
      type: 'updateHistory',
      actions: JSON.stringify(drawingRef.getToolState().history.root, null, 2),
    })
  }

  React.useLayoutEffect(() => {
    const listener = () => {
      if (!svgRef.current) {
        return
      }

      const { clientWidth, clientHeight } = svgRef.current

      drawingRef.sendEvent({
        kind: EventKind.ResizeView,
        viewWidth: clientWidth,
        viewHeight: clientHeight,
      })
    }
    window.addEventListener('resize', listener)
    return () => {
      window.removeEventListener('resize', listener)
    }
  })

  React.useLayoutEffect(() => {
    if (!svgRef.current) {
      return
    }

    const { clientWidth, clientHeight } = svgRef.current

    drawingRef.sendEvent({
      kind: EventKind.ResizeView,
      viewWidth: clientWidth,
      viewHeight: clientHeight,
    })
  }, [])

  React.useEffect(() => {
    const listener: StateChangeListener = () => {
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

    const button = domButtonToCanvasButton(e.button)
    if (!button && button !== 0) {
      return
    }

    const { offsetLeft, offsetTop } = containerRef.current

    drawingRef.sendEvent({
      kind: EventKind.MouseDown,
      ctrl: e.ctrlKey,
      button,
      point: [e.clientX - offsetLeft, e.clientY - offsetTop],
    })

    e.preventDefault();
  };

  const onMouseUp: React.MouseEventHandler<SVGSVGElement> = (e) => {
    if (!containerRef.current) {
      return
    }

    const button = domButtonToCanvasButton(e.button)
    if (!button && button !== 0) {
      return
    }

    const { offsetLeft, offsetTop } = containerRef.current

    drawingRef.sendEvent({
      kind: EventKind.MouseUp,
      ctrl: e.ctrlKey,
      button,
      point: [e.clientX - offsetLeft, e.clientY - offsetTop],
    })

    e.preventDefault()
  }

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
  let selectedObjects;

  const toolState = drawingRef.getToolState()
  const tool = toolState.tool;
  switch (tool.kind) {
  case ToolKind.Pen: {
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
              svgs.push(<line key={lineObj.id} x1={point1Obj.point[0]} y1={point1Obj.point[1]} x2={point2Obj.point[0]} y2={point2Obj.point[1]} strokeWidth={1} stroke="blue" />)
            }
          }
        }
        for (const pointObjectID of nextObj.points) {
          const pointObj = tool.tempObjectMap[pointObjectID];
          if (pointObj?.kind === ObjectKind.Node) {
            svgs.push(<circle key={pointObjectID} cx={pointObj.point[0]} cy={pointObj.point[1]} r={3} fill="none" strokeWidth={1} stroke="blue" />);
          }
        }
        break;
      }
    }
    break;
  }

  case ToolKind.Selector:
    selectedObjects = tool.selectedObjects
    break;

  case ToolKind.Text: {
    const nextObj = tool.tempObjectMap[tool.nextObjectID]
    if (nextObj && nextObj.kind === ObjectKind.Text) {
      const pointObj = tool.tempObjectMap[nextObj.point]
      if (pointObj && pointObj.kind === ObjectKind.Node) {
        svgs.push(<circle key={pointObj.id} cx={pointObj.point[0]} cy={pointObj.point[1]} r={3} fill="none" strokeWidth={1} stroke="green" />)
        svgs.push(<text key={nextObj.id} x={pointObj.point[0]} y={pointObj.point[1]}>{nextObj.text}</text>)
      }
    }
    break;
  }
  }

  const dataState = drawingRef.getDataState();
  for (const [k, v] of Object.entries(dataState.objects)) {
    if (!v) {
      continue;
    }
    switch (v.kind) {
    case ObjectKind.Path:
      for (const pointID of v.points) {
        const pointObj = dataState.objects[pointID];
        if (pointObj && pointObj.kind === ObjectKind.Node) {
          const selected = selectedObjects && selectedObjects.has(pointID)
          let stroke = 'black'
          if (selected) {
            stroke = 'red'
          }
          svgs.push(<circle key={pointID} cx={pointObj.point[0]} cy={pointObj.point[1]} r={3} fill="none" strokeWidth={1} stroke={stroke} />);
        }
      }
      for (const lineID of v.lines) {
        const lineObj = dataState.objects[lineID];
        if (lineObj && lineObj.kind === ObjectKind.Line) {
          const point1Obj = dataState.objects[lineObj.point1];
          const point2Obj = dataState.objects[lineObj.point2];
          if (point1Obj && point2Obj && point1Obj.kind === ObjectKind.Node && point2Obj.kind === ObjectKind.Node) {
            const selected = selectedObjects && selectedObjects.has(lineID);
            if (selected) {
              svgs.push(<line key={lineID} x1={point1Obj.point[0]} y1={point1Obj.point[1]} x2={point2Obj.point[0]} y2={point2Obj.point[1]} strokeWidth={2} stroke="red" />);
            }
          }
        }
      }
      break;

    case ObjectKind.Text: {
      const pointObj = dataState.objects[v.point]
      if (pointObj && pointObj.kind === ObjectKind.Node) {
        const selected = selectedObjects && selectedObjects.has(pointObj.id)
        let stroke = 'black'
        if (selected) {
          stroke = 'red'
        }
        svgs.push(<circle key={pointObj.id} cx={pointObj.point[0]} cy={pointObj.point[1]} r={3} fill="none" strokeWidth={1} stroke={stroke} />)
      }
      break
    }
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}>
      <SVGPreview
        state={dataState}
        width={containerRef.current?.clientWidth}
        height={containerRef.current?.clientHeight}
        // viewBox={viewBox}
        onRender={(svg) => {
          svgRef.current = svg
        }}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        overlay={svgs}
      />
    </div>
  );
}

function Canvas() {
  const [state, dispatch] = React.useReducer(controllerReducer, initialControllerState);

  const objRef = React.useRef<Drawing>();
  if (!objRef.current) {
    objRef.current = new Drawing();
  }
  const drawingRef = objRef.current;

  const toolbarHeight = 40;

  return (
    <div className={styles.canvasContainer}>
      <DrawingWrapper drawing={drawingRef} dispatch={dispatch} />
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
        <Toolbar state={state} height={toolbarHeight} />
        <SideBars state={state} style={{ flex: 1 }} drawing={drawingRef} />
      </div>
    </div>
  );
}

function App() {
  return (
    <Canvas />
  );
}

export default App;
