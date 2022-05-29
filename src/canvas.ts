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

export enum ActionKind {
    AddNode,
    UpdateNextNode,
    SelectTool,
    CommitPen,
    UpdateMousePoint,
}

function actionToSave(kind: ActionKind): boolean {
    switch (kind) {
    case ActionKind.AddNode:
        return false;
    case ActionKind.UpdateNextNode:
        return false;
    case ActionKind.SelectTool:
        return false;
    case ActionKind.UpdateMousePoint:
        return false;
    case ActionKind.CommitPen:
        return true;
    }
}

type Action =
    {
        kind: ActionKind.AddNode,
        point: Point,
    } |
    {
        kind: ActionKind.UpdateNextNode,
        point: Point,
    } |
    {
        kind: ActionKind.SelectTool,
        tool: ToolKind,
    } |
    {
        kind: ActionKind.UpdateMousePoint,
        point: Point,
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
    action: Action,
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

export interface State {
    tool: Tool,
    history: ActionHistory,
    objects: ObjectMap,
    mousePoint: Point,
}

const generateID = (() => {
    let id = 0;
    return (): ObjectID => {
        return ++id;
    }
})();

function appendHistory(state: State, action: Action) {
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

function executeAction(state: State, action: Action): boolean {
    if (actionToSave(action.kind)) {
        appendHistory(state, action);
    }

    switch (action.kind) {
    case ActionKind.AddNode:
        switch (state.tool.kind) {
        case ToolKind.Pen:
            const tempObject = state.tool.tempObjectMap[state.tool.tempObjectID];
            if (!tempObject || tempObject.kind !== ObjectKind.Path) {
                return false;
            }

            const nextObj = state.tool.tempObjectMap[state.tool.nextObjectID];
            if (!nextObj || nextObj.kind !== ObjectKind.Path || !nextObj.points.length) {
                return false;
            }

            const lastPoint = state.tool.tempObjectMap[nextObj.points[nextObj.points.length - 1]];
            if (!lastPoint || lastPoint.kind !== ObjectKind.Node) {
                return false;
            }

            tempObject.points.push(lastPoint.id);

            const nextPoint: CanvasObject = {
                id: generateID(),
                kind: ObjectKind.Node,
                point: state.mousePoint,
            }
            state.tool.tempObjectMap[nextPoint.id] = nextPoint;
            nextObj.points.push(nextPoint.id);
            return true;
        }

        return false;

    case ActionKind.UpdateNextNode:
        switch (state.tool.kind) {
        case ToolKind.Pen:
            const nextObj = state.tool.tempObjectMap[state.tool.nextObjectID];
            if (!nextObj || nextObj.kind !== ObjectKind.Path) {
                return false;
            }

            if (!nextObj.points.length) {
                return false;
            }

            const nextPoint = state.tool.tempObjectMap[nextObj.points[nextObj.points.length - 1]];
            if (nextPoint && nextPoint.kind === ObjectKind.Node) {
                nextPoint.point = action.point;
            }
            return true;

        default:
            return false;
        }

    case ActionKind.SelectTool:
        if (state.tool.kind === action.tool) {
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
                point: state.mousePoint,
            }
            const nextPath: CanvasObject = {
                id: generateID(),
                kind: ObjectKind.Path,
                points: [nextNode.id],
                lines: [],
            }
            state.tool = {
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
            state.tool = {
                kind: ToolKind.Selector,
            }
            return true;
        
        default:
            return false;
        }

    case ActionKind.UpdateMousePoint:
        state.mousePoint = action.point;
        return true;
    }
}

function generateAction(state: State, event: Event): Action[] {
    const actions: Action[] = [];

    switch (event.kind) {
    case EventKind.MouseMove:
        actions.push({
            kind: ActionKind.UpdateMousePoint,
            point: event.point,
        })

        switch (state.tool.kind) {
        case ToolKind.Pen:
            actions.push({
                kind: ActionKind.UpdateNextNode,
                point: event.point,
            });
            break;
        }

        break;

    case EventKind.MouseDown:
        switch (state.tool.kind) {
        case ToolKind.Pen:
            actions.push({
                kind: ActionKind.AddNode,
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
            actions.push({
                kind: ActionKind.SelectTool,
                tool: ToolKind.Pen
            });
            break;
        case 's':
            actions.push({
                kind: ActionKind.SelectTool,
                tool: ToolKind.Selector,
            });
            break;
        case 'Enter':
            switch (state.tool.kind) {
            case ToolKind.Pen:
                // actions.push({
                //     kind: ActionKind.
                // })
                break;
            }
            break;
        }
        break;

    case EventKind.KeyUp:
        break;
    }

    return actions;
}

export interface StateChangeEvent {
    state: State,
}

export type StateChangeListener = (e: StateChangeEvent) => void;

export class Drawing {
    private state: State = {
        tool: {
            kind: ToolKind.Selector,
        },
        history: {},
        objects: {},
        mousePoint: [50, 50],
    };

    private listeners: Set<StateChangeListener> = new Set();

    public getState(): Readonly<State> {
        return this.state;
    }

    public addStateChangeListener(h: StateChangeListener) {
        this.listeners.add(h);
    }

    public removeStateChangeListener(h: StateChangeListener) {
        this.listeners.delete(h);
    }

    public sendEvent(event: Event) {
        const actions = generateAction(this.state, event);
        if (!actions.length) {
            return;
        }

        let changed = false;
        for (const action of actions) {
            if (executeAction(this.state, action)) {
                changed = true;
            }
        }
        if (!changed) {
            return;
        }

        const changeEv = {
            state: this.state,
        }
        this.listeners.forEach((v) => {
            v(changeEv);
        })
    }
}
