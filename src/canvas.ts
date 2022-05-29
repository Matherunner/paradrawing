export type Point = [number, number];

export enum EventKind {
    MouseMove,
    MouseDown,
    MouseUp,
    KeyDown,
    KeyUp,
}

export type Event =
    {
        kind: EventKind.MouseMove,
        point: Point,
    } |
    {
        kind: EventKind.MouseDown,
        point: Point,
    } |
    {
        kind: EventKind.MouseUp,
        point: Point,
    } |
    {
        kind: EventKind.KeyDown,
        key: string,
    } |
    {
        kind: EventKind.KeyUp,
        key: string,
    }

export enum ToolKind {
    Selector,
    Pen,
}

export enum ToolActionKind {
    AddNode,
    UpdateNextNode,
    SelectTool,
    CommitPen,
    UpdateMousePoint,
    AddHistory,
}

export enum DataActionKind {
    AddObject,
}

export type DataAction =
    {
        id: ObjectID,
    } & ({
        kind: DataActionKind.AddObject,
        map: ObjectMap,
    })

type ToolAction =
    {
        kind: ToolActionKind.AddNode,
        point: Point,
    } |
    {
        kind: ToolActionKind.UpdateNextNode,
        point: Point,
    } |
    {
        kind: ToolActionKind.SelectTool,
        tool: ToolKind,
    } |
    {
        kind: ToolActionKind.UpdateMousePoint,
        point: Point,
    } |
    {
        kind: ToolActionKind.AddHistory,
        action: DataAction,
    }

type Tool =
    {
        kind: ToolKind.Selector,
    } |
    {
        kind: ToolKind.Pen,
        tempObjectMap: ObjectMap,
        tempObjectID: ObjectID,
        nextObjectID: ObjectID,
    }

interface ActionHistory {
    root?: ActionHistoryNode,
    cur?: ActionHistoryNode,
}

interface ActionHistoryNode {
    action: DataAction,
    children: ActionHistoryNode[],
}

export enum ObjectKind {
    Node,
    Line,
    Path,
    ControlPoint,
}

type ObjectID = number;

type CanvasObject = {
    id: ObjectID;
} & (
    {
        kind: ObjectKind.Node,
        point: Point,
    } |
    {
        kind: ObjectKind.Line,
        point1: ObjectID,
        point2: ObjectID,
    } |
    {
        kind: ObjectKind.Path,
        points: ObjectID[],
        lines: ObjectID[],
    }
)

type ObjectMap = {
    [key: ObjectID]: CanvasObject | undefined,
};

export interface DataState {
    objects: ObjectMap,
}

export interface ToolState {
    tool: Tool,
    history: ActionHistory,
    mousePoint: Point,
}

const generateID = (() => {
    let id = 0;
    return (): ObjectID => {
        return ++id;
    }
})();

function addToSet<T>(s: Set<T>, ...items: T[]) {
    for (const item of items) {
        s.add(item)
    }
}

function filterObjectMap(map: ObjectMap, ids: ObjectID[]) {
    const inc = new Set(ids);
    for (const id of ids) {
        const obj = map[id];
        if (!obj) {
            continue;
        }
        switch (obj.kind) {
        case ObjectKind.Path:
            addToSet(inc, ...obj.points)
            addToSet(inc, ...obj.lines)
            break;
        }
    }
    for (const key in map) {
        if (!inc.has(+key)) {
            delete map[key];
        }
    }
}

function appendHistory(state: ToolState, action: DataAction) {
    if (!state.history.cur) {
        state.history.cur = state.history.root;
    }
    if (!state.history.cur) {
        if (!state.history.root) {
            state.history.root = {
                action,
                children: [],
            }
            state.history.cur = state.history.root;
        }
    } else {
        const newChild = {
            action,
            children: [],
        }
        state.history.cur.children.push(newChild);
        state.history.cur = newChild;
    }
}

function executeDataAction(state: DataState, action: Readonly<DataAction>): boolean {
    switch (action.kind) {
    case DataActionKind.AddObject:
        Object.assign(state.objects, action.map);
        return true;
    }
}

function executeToolAction(toolState: ToolState, action: Readonly<ToolAction>): boolean {
    switch (action.kind) {
    case ToolActionKind.AddNode:
        switch (toolState.tool.kind) {
        case ToolKind.Pen:
            const tempObject = toolState.tool.tempObjectMap[toolState.tool.tempObjectID];
            if (!tempObject || tempObject.kind !== ObjectKind.Path) {
                return false;
            }

            const nextObj = toolState.tool.tempObjectMap[toolState.tool.nextObjectID];
            if (!nextObj || nextObj.kind !== ObjectKind.Path || !nextObj.points.length) {
                return false;
            }

            const lastPointID = nextObj.points[nextObj.points.length - 1];
            tempObject.points.push(lastPointID);

            if (nextObj.lines.length) {
                const lastLineID = nextObj.lines[nextObj.lines.length - 1];
                tempObject.lines.push(lastLineID);
            }

            const nextPoint: CanvasObject = {
                id: generateID(),
                kind: ObjectKind.Node,
                point: toolState.mousePoint,
            }
            const nextLine: CanvasObject = {
                id: generateID(),
                kind: ObjectKind.Line,
                point1: lastPointID,
                point2: nextPoint.id,
            }
            toolState.tool.tempObjectMap[nextPoint.id] = nextPoint;
            toolState.tool.tempObjectMap[nextLine.id] = nextLine;
            nextObj.points.push(nextPoint.id);
            nextObj.lines.push(nextLine.id);
            return true;
        }

        return false;

    case ToolActionKind.UpdateNextNode:
        switch (toolState.tool.kind) {
        case ToolKind.Pen:
            const nextObj = toolState.tool.tempObjectMap[toolState.tool.nextObjectID];
            if (!nextObj || nextObj.kind !== ObjectKind.Path) {
                return false;
            }

            if (!nextObj.points.length) {
                return false;
            }

            const nextPoint = toolState.tool.tempObjectMap[nextObj.points[nextObj.points.length - 1]];
            if (nextPoint && nextPoint.kind === ObjectKind.Node) {
                nextPoint.point = action.point;
            }
            return true;

        default:
            return false;
        }

    case ToolActionKind.SelectTool:
        if (toolState.tool.kind === action.tool) {
            return false;
        }

        switch (action.tool) {
        case ToolKind.Pen:
            const path: CanvasObject = {
                id: generateID(),
                kind: ObjectKind.Path,
                points: [],
                lines: [],
            };
            const nextNode: CanvasObject = {
                id: generateID(),
                kind: ObjectKind.Node,
                point: toolState.mousePoint,
            }
            const nextPath: CanvasObject = {
                id: generateID(),
                kind: ObjectKind.Path,
                points: [nextNode.id],
                lines: [],
            }
            toolState.tool = {
                kind: ToolKind.Pen,
                tempObjectMap: {
                    [path.id]: path,
                    [nextPath.id]: nextPath,
                    [nextNode.id]: nextNode,
                },
                tempObjectID: path.id,
                nextObjectID: nextPath.id,
            }
            return true;

        case ToolKind.Selector:
            toolState.tool = {
                kind: ToolKind.Selector,
            }
            return true;

        default:
            return false;
        }

    case ToolActionKind.UpdateMousePoint:
        toolState.mousePoint = action.point;
        return true;

    case ToolActionKind.AddHistory:
        appendHistory(toolState, action.action);
        return true;
    }
}

function generateAction(state: Readonly<ToolState>, event: Event): [ToolAction[], DataAction[]] {
    const toolActions: ToolAction[] = [];
    const dataActions: DataAction[] = [];

    switch (event.kind) {
    case EventKind.MouseMove:
        toolActions.push({
            kind: ToolActionKind.UpdateMousePoint,
            point: event.point,
        })

        switch (state.tool.kind) {
        case ToolKind.Pen:
            toolActions.push({
                kind: ToolActionKind.UpdateNextNode,
                point: event.point,
            });
            break;
        }

        break;

    case EventKind.MouseDown:
        switch (state.tool.kind) {
        case ToolKind.Pen:
            toolActions.push({
                kind: ToolActionKind.AddNode,
                point: event.point,
            });
            break;
        }

        break;

    case EventKind.MouseUp:
        break;

    case EventKind.KeyDown:
        switch (event.key) {
        case 'p':
            toolActions.push({
                kind: ToolActionKind.SelectTool,
                tool: ToolKind.Pen
            });
            break;
        case 's':
            toolActions.push({
                kind: ToolActionKind.SelectTool,
                tool: ToolKind.Selector,
            });
            break;
        case 'Enter':
            switch (state.tool.kind) {
            case ToolKind.Pen:
                toolActions.push({
                    kind: ToolActionKind.SelectTool,
                    tool: ToolKind.Selector,
                })

                // Kind of a hack to do it here and mutate the object
                filterObjectMap(state.tool.tempObjectMap, [state.tool.tempObjectID]);

                dataActions.push({
                    id: generateID(),
                    kind: DataActionKind.AddObject,
                    map: state.tool.tempObjectMap,
                })
                break;
            }
            break;
        }
        break;

    case EventKind.KeyUp:
        break;
    }

    for (const action of dataActions) {
        toolActions.push({
            kind: ToolActionKind.AddHistory,
            action,
        })
    }

    return [toolActions, dataActions];
}

export interface StateChangeEvent {
    state: ToolState,
}

export type StateChangeListener = (e: StateChangeEvent) => void;

export class Drawing {
    private toolState: ToolState = {
        tool: {
            kind: ToolKind.Selector,
        },
        history: {},
        mousePoint: [50, 50],
    };

    private dataState: DataState = {
        objects: {},
    }

    private listeners: Set<StateChangeListener> = new Set();

    public getToolState(): Readonly<ToolState> {
        return this.toolState;
    }

    public getDataState(): Readonly<DataState> {
        return this.dataState;
    }

    public addStateChangeListener(h: StateChangeListener) {
        this.listeners.add(h);
    }

    public removeStateChangeListener(h: StateChangeListener) {
        this.listeners.delete(h);
    }

    public sendEvent(event: Event) {
        const [toolActions, dataActions] = generateAction(this.toolState, event);

        let changed = false;

        for (const action of toolActions) {
            if (executeToolAction(this.toolState, action)) {
                changed = true;
            }
        }

        for (const action of dataActions) {
            if (executeDataAction(this.dataState, action)) {
                changed = true;
            }
        }

        if (!changed) {
            return;
        }

        const changeEv = {
            state: this.toolState,
        }
        this.listeners.forEach((v) => {
            v(changeEv);
        })
    }
}
