import React, { CSSProperties, PropsWithChildren } from 'react';
import katex from 'katex';
import styles from './App.module.css';
import { ActionHistory, Button, DataState, Drawing, EventKind, ObjectID, ObjectKind, ObjectMap, PanStateKind, StateChangeListener, ToolKind, ToolState, transformDataToSVG, transformSVGToData, transformViewportToData, Vec2D } from './canvas';

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

interface ControllerState {
  currentToolType: ToolKind;
  commands: string;
  drawingSize: {
    width: number,
    height: number,
  }
}

const initialControllerState = {
  currentToolType: ToolKind.Pen,
  commands: '',
  drawingSize: {
    width: 0,
    height: 0,
  }
}

type ControllerAction =
  { type: 'selectTool', toolType: ToolKind } |
  { type: 'updateHistory', actions: string } |
  { type: 'resizeDrawing', size: { width: number, height: number } }

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

  case 'resizeDrawing':
    return {
      ...state,
      drawingSize: action.size,
    }

  default:
    return state;
  }
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

interface ToolbarProps {
  state: ControllerState,
  drawing: Drawing,
  height?: number,
}

function Toolbar(props: PropsWithChildren<ToolbarProps>) {
  const toolboxName = toolTypeToString(props.state.currentToolType);

  const height = props.height ?? DEFAULT_TOOLBAR_HEIGHT

  const toolState = props.drawing.getToolState()
  const viewBox = toolState.viewBox;
  const offset = transformSVGToData(toolState, viewBox.offset)
  offset[1] -= viewBox.height

  const mouse = transformViewportToData(toolState, toolState.mousePoint)

  return (
    <div style={{ width: '100%', height, backgroundColor: '#eeeeff', pointerEvents: 'auto' }}>
      <span>{toolboxName}</span>
      <span> View Box: {offset[0]} {offset[1]} {offset[0] + viewBox.width} {offset[1] + viewBox.height}</span>
      <span> Mouse: {mouse[0]} {mouse[1]}</span>
    </div>
  );
}

function serialiseStates(state: ToolState) {
  const history = state.history
  const s = JSON.stringify(history)
  return new Blob([s], { type: 'text/plain' })
}

interface LeftSideBarProps {
  state: ControllerState,
  drawing: Drawing,
}

function LeftSideBar(props: PropsWithChildren<LeftSideBarProps>) {
  const [saveFileURL, setSaveFileURL] = React.useState('')


  const fileRef = React.useRef<HTMLInputElement>(null)

  const toolState = props.drawing.getToolState()

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
      <div>
        <button onClick={() => {
          const data = serialiseStates(toolState)
          const url = URL.createObjectURL(data)
          setSaveFileURL(url)
        }}>Save</button>
        <button onFocus={(e) => e.target.blur()} onClick={() => {
          if (fileRef.current) {
            fileRef.current.click()
          }
        }}>Load</button>
        <input ref={fileRef} type="file" onChange={(e) => {
          if (!e.target.files || !e.target.files.length) {
            return
          }

          const file = e.target.files[0]
          const fileReader = new FileReader()
          fileReader.addEventListener('load', (e) => {
            if (!e.target || typeof e.target.result !== 'string') {
              return
            }

            const result = e.target.result
            const history: ActionHistory = JSON.parse(result)

            console.log(history)

            props.drawing.resetTool()

            let cur = history.root
            for (;;) {
              if (cur) {
                props.drawing.executeDataAction(cur.action)
                cur = cur.children[0]
              } else {
                break
              }
            }

            // TODO: need to resize view here
            props.drawing.sendEvent({
              kind: EventKind.ResizeView,
              viewWidth: props.state.drawingSize.width,
              viewHeight: props.state.drawingSize.height,
            })

            props.drawing.sendEvent({
              kind: EventKind.SetViewOffset,
              offset: [-Math.round(props.state.drawingSize.width / 2.618), -Math.round(props.state.drawingSize.height * 1.618 / 2.618)],
            })
          })
          fileReader.readAsText(file)
        }} hidden />
      </div>
      <div>
        {saveFileURL ? (
          <a href={saveFileURL} download>Save File</a>
        ) : null}
      </div>
      <CommandList state={props.state} />
    </div>
  )
}

interface RightSideBarProps {
  state: ControllerState,
  drawing: Drawing,
  dataToSVGCoord?: (p: Vec2D) => Vec2D,
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
        <SVGPreview
          state={drawingRef.getDataState()}
          dataToSVGCoord={props.dataToSVGCoord}
          onRender={(e) => previewSVG.current = e}
          fitToContent
        />
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
      <LeftSideBar
        state={props.state}
        drawing={props.drawing}
      />
      <RightSideBar
        state={props.state}
        drawing={props.drawing}
        dataToSVGCoord={(p) => transformDataToSVG(props.drawing.getToolState(), p)}
      />
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

function dataObjectToSVG(objectID: ObjectID, map: ObjectMap, dataToSVGCoord: (p: Vec2D) => Vec2D): JSX.Element[] {
  const svgs: JSX.Element[] = []

  const v = map[objectID]
  if (!v) {
    return svgs
  }

  switch (v.kind) {
  case ObjectKind.Path: {
    for (const lineID of v.lines) {
      const lineObj = map[lineID];
      if (lineObj && lineObj.kind === ObjectKind.Line) {
        const point1Obj = map[lineObj.point1];
        const point2Obj = map[lineObj.point2];
        if (point1Obj && point2Obj && point1Obj.kind === ObjectKind.Node && point2Obj.kind === ObjectKind.Node) {
          const p1 = dataToSVGCoord(point1Obj.point)
          const p2 = dataToSVGCoord(point2Obj.point)
          svgs.push(<line key={lineID} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} strokeWidth={1} stroke="black" />);
        }
      }
    }
    break;
  }

  case ObjectKind.Text: {
    const pointObj = map[v.point]
    if (pointObj && pointObj.kind === ObjectKind.Node) {
      const p = dataToSVGCoord(pointObj.point)
      svgs.push(
        <foreignObject
          key={v.id}
          x={p[0]}
          y={p[1]}
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

  return svgs
}

interface SVGPreviewProps {
  state: DataState,
  dataToSVGCoord?: (point: Vec2D) => Vec2D,
  style?: CSSProperties,
  width?: number,
  height?: number,
  fitToContent?: boolean,
  viewBox?: string,
  overlay?: React.ReactNode,
  guides?: boolean,
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

  const dataToSVGCoord = props.dataToSVGCoord || (v => v);

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

  let svgs: JSX.Element[] = []

  for (const objID of Object.keys(props.state.objects)) {
    svgs = svgs.concat(dataObjectToSVG(+objID, props.state.objects, dataToSVGCoord))
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
      style={{ display: 'block', ...props.style }}
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

  const drawingInitialised = React.useRef(false);

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
      if (!containerRef.current) {
        return
      }

      const { clientWidth, clientHeight } = containerRef.current

      drawingRef.sendEvent({
        kind: EventKind.ResizeView,
        viewWidth: clientWidth,
        viewHeight: clientHeight,
      })

      props.dispatch({ type: 'resizeDrawing', size: { width: clientWidth, height: clientHeight } })
    }
    window.addEventListener('resize', listener)
    return () => {
      window.removeEventListener('resize', listener)
    }
  }, [])

  React.useLayoutEffect(() => {
    if (!containerRef.current || drawingInitialised.current) {
      return
    }

    const { clientWidth, clientHeight } = containerRef.current

    drawingRef.sendEvent({
      kind: EventKind.ResizeView,
      viewWidth: clientWidth,
      viewHeight: clientHeight,
    })

    props.dispatch({ type: 'resizeDrawing', size: { width: clientWidth, height: clientHeight } })

    drawingRef.sendEvent({
      kind: EventKind.SetViewOffset,
      offset: [-Math.round(clientWidth / 2.618), -Math.round(clientHeight * 1.618 / 2.618)],
    })

    // Create guide origin point
    drawingRef.sendEvent({
      kind: EventKind.AddObject,
      guide: true,
      object: {
        kind: ObjectKind.FixedNode,
        point: [0, 0],
      }
    })

    // TODO: maybe make the sendEvent idempotent using some idempotent key? Especially for AddObject
    drawingInitialised.current = true
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

  let cursor = 'auto';

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
              const p1 = transformDataToSVG(toolState, point1Obj.point)
              const p2 = transformDataToSVG(toolState, point2Obj.point)
              svgs.push(<line key={lineObj.id} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} strokeWidth={1} stroke="blue" />)
            }
          }
        }
        for (const pointObjectID of nextObj.points) {
          const pointObj = tool.tempObjectMap[pointObjectID];
          if (pointObj?.kind === ObjectKind.Node) {
            const p = transformDataToSVG(toolState, pointObj.point)
            svgs.push(<circle key={pointObjectID} cx={p[0]} cy={p[1]} r={3} fill="none" strokeWidth={1} stroke="blue" />);
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
        const p = transformDataToSVG(toolState, pointObj.point)
        svgs.push(<circle key={pointObj.id} cx={p[0]} cy={p[1]} r={3} fill="none" strokeWidth={1} stroke="green" />)
        svgs.push(<text key={nextObj.id} x={p[0]} y={p[1]}>{nextObj.text}</text>)
      }
    }
    break;
  }
  }

  switch (toolState.tool.kind) {
  case ToolKind.Pen:
  case ToolKind.Text:
    cursor = 'crosshair'
    break
  }

  switch (toolState.pan.kind) {
  case PanStateKind.Panning:
    cursor = 'grabbing'
    break
  }

  const dataState = drawingRef.getDataState();
  for (const [, v] of Object.entries(dataState.objects)) {
    if (!v) {
      continue;
    }
    switch (v.kind) {
    case ObjectKind.Path:
      for (const pointID of v.points) {
        const pointObj = dataState.objects[pointID];
        if (pointObj && pointObj.kind === ObjectKind.Node) {
          const p = transformDataToSVG(toolState, pointObj.point)
          const selected = selectedObjects && selectedObjects.has(pointID)
          let stroke = 'black'
          if (v.guide) {
            stroke = 'lightgray'
          }
          if (selected) {
            stroke = 'red'
          }
          svgs.push(<circle key={pointID} cx={p[0]} cy={p[1]} r={3} fill="none" strokeWidth={1} stroke={stroke} />);
        }
      }
      for (const lineID of v.lines) {
        const lineObj = dataState.objects[lineID];
        if (lineObj && lineObj.kind === ObjectKind.Line) {
          const point1Obj = dataState.objects[lineObj.point1];
          const point2Obj = dataState.objects[lineObj.point2];
          if (point1Obj && point2Obj && point1Obj.kind === ObjectKind.Node && point2Obj.kind === ObjectKind.Node) {
            const p1 = transformDataToSVG(toolState, point1Obj.point)
            const p2 = transformDataToSVG(toolState, point2Obj.point)
            const selected = selectedObjects && selectedObjects.has(lineID);
            if (selected || v.guide) {
              let stroke = 'lightgray'
              if (selected) {
                stroke = 'red'
              }
              svgs.push(<line key={lineID} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} strokeWidth={2} stroke={stroke} />);
            }
          }
        }
      }
      break;

    case ObjectKind.Text: {
      const pointObj = dataState.objects[v.point]
      if (pointObj && pointObj.kind === ObjectKind.Node) {
        const p = transformDataToSVG(toolState, pointObj.point)
        const selected = selectedObjects && selectedObjects.has(pointObj.id)
        let stroke = 'black'
        if (selected) {
          stroke = 'red'
        }
        svgs.push(<circle key={pointObj.id} cx={p[0]} cy={p[1]} r={3} fill="none" strokeWidth={1} stroke={stroke} />)
      }
      break
    }

    case ObjectKind.FixedNode: {
      const p = transformDataToSVG(toolState, v.point)
      const selected = selectedObjects && selectedObjects.has(v.id)
      let stroke = 'black'
      if (v.guide) {
        stroke = 'lightgray'
      }
      if (selected) {
        stroke = 'red'
      }
      svgs.push(<circle key={v.id} cx={p[0]} cy={p[1]} r={3} fill="none" strokeWidth={1} stroke={stroke} />)
      break
    }
    }
  }

  // Draw x and y axes
  if (toolState.viewBox.offset[0] <= 0 && toolState.viewBox.offset[0] + toolState.viewBox.width >= 0) {
    svgs.push(
      <line
        key="x-axis"
        x1={0}
        y1={toolState.viewBox.offset[1] - toolState.viewBox.height}
        x2={0}
        y2={toolState.viewBox.offset[1] + toolState.viewBox.height * 2}
        strokeWidth={1}
        stroke="lightgray"
      />
    )
  }
  if (toolState.viewBox.offset[1] <= 0 && toolState.viewBox.offset[1] + toolState.viewBox.height >= 0) {
    svgs.push(
      <line
        key="y-axis"
        x1={toolState.viewBox.offset[0] - toolState.viewBox.width}
        y1={0}
        x2={toolState.viewBox.offset[0] + toolState.viewBox.width * 2}
        y2={0}
        strokeWidth={1}
        stroke="lightgray"
      />
    )
  }

  const viewBox = `${toolState.viewBox.offset[0]} ${toolState.viewBox.offset[1]} ${toolState.viewBox.width} ${toolState.viewBox.height}`

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => {
        e.preventDefault()
      }}
      style={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
    >
      <SVGPreview
        state={dataState}
        dataToSVGCoord={p => transformDataToSVG(toolState, p)}
        style={{ cursor, }}
        width={containerRef.current?.clientWidth}
        height={containerRef.current?.clientHeight}
        viewBox={viewBox}
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
        <Toolbar state={state} height={toolbarHeight} drawing={drawingRef} />
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
