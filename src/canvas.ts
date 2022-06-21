import { Matrix, SingularValueDecomposition } from 'ml-matrix';

export type Vec2D = [number, number];

export enum ConstraintKind {
    Perpendicular,
    Parallel,
    Distance,
    Angle,
    Coincident,
    Horizontal,
    Vertical,
}

// High level constraint. Not including implicit constraints like a line is made up of two points at a fixed distance
export type Constraint =
    {
        kind: ConstraintKind.Perpendicular,
        line1: ObjectID,
        line2: ObjectID,
    } |
    {
        kind: ConstraintKind.Parallel,
        line1: ObjectID,
        line2: ObjectID,
    } |
    {
        kind: ConstraintKind.Coincident,
        object1: ObjectID,
        object2: ObjectID,
    } |
    {
        kind: ConstraintKind.Horizontal,
        object: ObjectID,
    } |
    {
        kind: ConstraintKind.Vertical,
        object: ObjectID,
    } |
    {
        kind: ConstraintKind.Distance,
        distance: number,
        object1: ObjectID,
        object2?: ObjectID,
    }

export enum EventKind {
    MouseMove,
    MouseDown,
    MouseUp,
    KeyDown,
    KeyUp,

    ResizeView,
    ScaleView,
    SetViewOffset,

    AddPerpendicularConstraint,
    AddCoincidentConstraint,
    AddHorizontalConstraint,
    AddVerticalConstraint,
    AddDistanceConstraint,

    SelectTextTool,
    SetTextValue,

    AddObject,
}

export enum Button {
    Primary,
    Secondary,
    Auxiliary,
}

export type Event =
    {
        kind: EventKind.MouseMove,
        point: Vec2D,
    } |
    {
        kind: EventKind.MouseDown,
        ctrl: boolean,
        button: Button,
        point: Vec2D,
    } |
    {
        kind: EventKind.MouseUp,
        ctrl: boolean,
        button: Button,
        point: Vec2D,
    } |
    {
        kind: EventKind.KeyDown,
        key: string,
    } |
    {
        kind: EventKind.KeyUp,
        key: string,
    } |
    {
        kind: EventKind.ResizeView,
        viewWidth: number,
        viewHeight: number,
    } |
    {
        kind: EventKind.ScaleView,
        scale: number,
    } |
    {
        kind: EventKind.SetViewOffset,
        offset: Vec2D,
    } |
    {
        kind: EventKind.AddPerpendicularConstraint,
    } |
    {
        kind: EventKind.AddCoincidentConstraint,
    } |
    {
        kind: EventKind.AddHorizontalConstraint,
    } |
    {
        kind: EventKind.AddDistanceConstraint,
        distance: number,
    } |
    {
        kind: EventKind.AddVerticalConstraint,
    } |
    {
        kind: EventKind.SelectTextTool,
    } |
    {
        kind: EventKind.SetTextValue,
        text: string,
    } |
    {
        kind: EventKind.AddObject,
        guide: boolean,
        object: CanvasObjectData,
    }

export enum ToolKind {
    Selector,
    Pen,
    Text,
}

export enum ToolActionKind {
    UpdateMousePoint,
    SelectTool,

    ResizeView,
    SetViewOffset,

    StartPan,
    StopPan,
    UpdatePan,

    AddNode,
    UpdateNextNode,

    AddText,
    UpdateNextText,

    CommitPen,
    AddHistory,

    SelectObject,
    DeselectObject,

    AddObject,
}

export enum DataActionKind {
    AddObject,
    AddConstraint,
}

export type DataAction =
    {
        id: ObjectID,
    } & ({
        kind: DataActionKind.AddObject,
        map: ObjectMap,
    } |
    {
        kind: DataActionKind.AddConstraint,
        constraint: Constraint,
    })

type ToolAction =
    {
        kind: ToolActionKind.AddNode,
        point: Vec2D,
    } |
    {
        kind: ToolActionKind.UpdateNextNode,
        point: Vec2D,
    } |
    {
        kind: ToolActionKind.SelectTool,
        tool: ToolKind,
    } |
    {
        kind: ToolActionKind.ResizeView,
        width: number,
        height: number,
    } |
    {
        kind: ToolActionKind.SetViewOffset,
        offset: Vec2D,
    } |
    {
        kind: ToolActionKind.StartPan,
        point: Vec2D,
    } |
    {
        kind: ToolActionKind.StopPan,
    } |
    {
        kind: ToolActionKind.UpdatePan,
    } |
    {
        kind: ToolActionKind.UpdateNextText,
        text: string,
        point: Vec2D,
    } |
    {
        kind: ToolActionKind.UpdateMousePoint,
        point: Vec2D,
    } |
    {
        kind: ToolActionKind.AddHistory,
        action: DataAction,
    } |
    {
        kind: ToolActionKind.SelectObject,
        objectID: ObjectID,
    } |
    {
        kind: ToolActionKind.DeselectObject,
        objectID: ObjectID,
    }

type Tool =
    {
        kind: ToolKind.Selector,
        selectedObjects: Set<ObjectID>,
    } |
    {
        kind: ToolKind.Pen,
        tempObjectMap: ObjectMap,
        tempObjectID: ObjectID,
        nextObjectID: ObjectID,
    } |
    {
        kind: ToolKind.Text,
        tempObjectMap: ObjectMap,
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
    Text,
    FixedNode,
}

export type ObjectID = number;

export interface CanvasObjectCommon {
    id: ObjectID,
    guide: boolean,
}

export type CanvasObjectData =
    {
        kind: ObjectKind.Node,
        point: Vec2D,
    } |
    {
        kind: ObjectKind.FixedNode,
        point: Vec2D,
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
    } |
    {
        kind: ObjectKind.Text
        point: ObjectID,
        text: string,
    }

export type CanvasObject = CanvasObjectCommon & CanvasObjectData

export type ObjectMap = {
    [key: ObjectID]: CanvasObject | undefined,
};

export interface DataState {
    objects: ObjectMap,
    constraints: Constraint[],
}

export interface ViewBox {
    offset: Vec2D,
    width: number,
    height: number,
}

export enum PanStateKind {
    Idle,
    Panning,
}

export type PanState =
    {
        kind: PanStateKind.Idle,
    } |
    {
        kind: PanStateKind.Panning,
        start: Vec2D,
    }

export interface ToolState {
    tool: Tool,
    history: ActionHistory,
    // Point in viewport coordinates
    mousePoint: Vec2D,
    // viewbox attribute for SVG
    viewBox: ViewBox,
    // Offset to the origin of the data coordinate system
    dataOrigin: Vec2D,
    scale: number,
    pan: PanState,
}

const generateID = (() => {
    let id = 0;
    return (): ObjectID => {
        return ++id;
    }
})();

function vecMulX(a: number[], m: number) {
    for (let i = 0; i < a.length; ++i) {
        a[i] *= m
    }
}

function vecAddX(a: number[], b: number[]) {
    for (let i = 0; i < a.length; ++i) {
        a[i] += b[i]
    }
}

function vecSub(a: Vec2D, b: Vec2D): Vec2D {
    return [a[0] - b[0], a[1] - b[1]]
}

function vecSubX(a: number[], b: number[]) {
    for (let i = 0; i < a.length; ++i) {
        a[i] -= b[i]
    }
}

function vecDot(a: Vec2D, b: Vec2D): number {
    return a[0] * b[0] + a[1] * b[1]
}

function vecDotX(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; ++i) {
        sum += a[i] * b[i]
    }
    return sum
}

function vecCopyX(a: number[], b: number[]) {
    for (let i = 0; i < a.length; ++i) {
        a[i] = b[i]
    }
}

function hitNode(p: Vec2D, tol: number, mouse: Vec2D): boolean {
    const r = vecSub(mouse, p);
    const normSq = vecDot(r, r);
    return normSq < tol * tol
}

function hitLineSegment(a: Vec2D, b: Vec2D, tol: number, mouse: Vec2D): boolean {
    const mouseFromA = vecSub(mouse, a);
    const bFromA = vecSub(b, a);
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

function pointLikeObject(kind: ObjectKind): kind is ObjectKind.Node | ObjectKind.FixedNode {
    return kind === ObjectKind.Node || kind === ObjectKind.FixedNode
}

function transformConstraints(objects: ObjectMap, constraints: Constraint[]) {
    // Column index of this variable in the Jacobian matrix
    const jacColByVar = new Map<string, number>();

    const x: number[] = [];
    const writeResults: ((x: number[]) => void)[] = [];

    const mapKey = (objectID: ObjectID, index?: number) => {
        return `${objectID}-${index}`;
    }

    const addVariable = (objectID: ObjectID, index?: number) => {
        const obj = objects[objectID]
        if (!obj) {
            return;
        }

        if (obj.kind === ObjectKind.FixedNode) {
            // If fixed node, we handle it separately
            return
        }

        const key = mapKey(objectID, index)
        if (jacColByVar.has(key)) {
            return
        }
        jacColByVar.set(key, jacColByVar.size)

        switch (obj.kind) {
        case ObjectKind.Node:
            if (typeof index !== 'number') {
                return
            }
            const v = obj.point[index];
            x.push(v)

            const xi = x.length - 1;
            writeResults.push((x) => {
                obj.point[index] = x[xi]
            })
            break;
        }
    }

    const getVariable = (x: number[], objectID: ObjectID, index?: number): [number, number] => {
        const obj = objects[objectID]
        if (!obj) {
            throw new Error(`unknown object ID: ${objectID}`)
        }

        if (obj.kind === ObjectKind.FixedNode && typeof index === 'number') {
            // Always return the original point and never alter it
            return [-1, obj.point[index]]
        }

        const key = mapKey(objectID, index)
        const col = jacColByVar.get(key)
        if (typeof col === 'number') {
            return [col, x[col]]
        }
        throw new Error(`unknown variable: ${key}`)
    }

    const setGrad = (grad: number[], col: number, val: number) => {
        if (col !== -1) {
            grad[col] = val
        }
    }

    // G column vector
    const consFns: ((x: number[]) => number)[] = [];

    // Jacobian matrix
    const jacFns: ((x: number[], grad: number[]) => void)[] = [];

    // FIXME: include all constraints for now
    for (const cons of constraints) {
        switch (cons.kind) {
        case ConstraintKind.Perpendicular:
            const line1Obj = objects[cons.line1];
            const line2Obj = objects[cons.line2];
            if (!line1Obj || !line2Obj || line1Obj.kind !== ObjectKind.Line || line2Obj.kind !== ObjectKind.Line) {
                continue;
            }

            addVariable(line1Obj.point1, 0)
            addVariable(line1Obj.point1, 1)
            addVariable(line1Obj.point2, 0)
            addVariable(line1Obj.point2, 1)
            addVariable(line2Obj.point1, 0)
            addVariable(line2Obj.point1, 1)
            addVariable(line2Obj.point2, 0)
            addVariable(line2Obj.point2, 1)

            consFns.push((x) => {
                const [, p1x] = getVariable(x, line1Obj.point1, 0)
                const [, p1y] = getVariable(x, line1Obj.point1, 1)
                const [, p2x] = getVariable(x, line1Obj.point2, 0)
                const [, p2y] = getVariable(x, line1Obj.point2, 1)
                const [, p3x] = getVariable(x, line2Obj.point1, 0)
                const [, p3y] = getVariable(x, line2Obj.point1, 1)
                const [, p4x] = getVariable(x, line2Obj.point2, 0)
                const [, p4y] = getVariable(x, line2Obj.point2, 1)
                return (p2x - p1x) * (p4x - p3x) + (p2y - p1y) * (p4y - p3y)
            })

            // Check for implicit constraints, e.g. distance between points, etc
            // TODO: maybe not needed?

            jacFns.push((x, grad) => {
                const [p1xCol, p1x] = getVariable(x, line1Obj.point1, 0)
                const [p1yCol, p1y] = getVariable(x, line1Obj.point1, 1)
                const [p2xCol, p2x] = getVariable(x, line1Obj.point2, 0)
                const [p2yCol, p2y] = getVariable(x, line1Obj.point2, 1)
                const [p3xCol, p3x] = getVariable(x, line2Obj.point1, 0)
                const [p3yCol, p3y] = getVariable(x, line2Obj.point1, 1)
                const [p4xCol, p4x] = getVariable(x, line2Obj.point2, 0)
                const [p4yCol, p4y] = getVariable(x, line2Obj.point2, 1)
                setGrad(grad, p1xCol, p3x - p4x)
                setGrad(grad, p1yCol, p3y - p4y)
                setGrad(grad, p2xCol, p4x - p3x)
                setGrad(grad, p2yCol, p4y - p3y)
                setGrad(grad, p3xCol, p1x - p2x)
                setGrad(grad, p3yCol, p1y - p2y)
                setGrad(grad, p4xCol, p2x - p1x)
                setGrad(grad, p4yCol, p2y - p1y)
            })

            break;

        case ConstraintKind.Parallel:
            break;

        case ConstraintKind.Distance: {
            const obj1 = objects[cons.object1]
            const obj2 = typeof cons.object2 === 'number' ? objects[cons.object2] : undefined
            if (!obj1) {
                continue
            }

            if (!obj2 && obj1.kind !== ObjectKind.Line) {
                continue
            }

            if (obj2 && (!pointLikeObject(obj1.kind) || !pointLikeObject(obj2.kind))) {
                continue
            }

            const p1 = obj1.kind === ObjectKind.Line ? obj1.point1 : obj1.id
            const p2 = obj1.kind === ObjectKind.Line ? obj1.point2 : obj2 ? obj2.id : -1

            addVariable(p1, 0)
            addVariable(p1, 1)
            addVariable(p2, 0)
            addVariable(p2, 1)

            consFns.push((x) => {
                const [, p1x] = getVariable(x, p1, 0)
                const [, p1y] = getVariable(x, p1, 1)
                const [, p2x] = getVariable(x, p2, 0)
                const [, p2y] = getVariable(x, p2, 1)
                const dx = p2x - p1x
                const dy = p2y - p1y
                return dx * dx + dy * dy - cons.distance * cons.distance
            })

            jacFns.push((x, grad) => {
                const [p1xCol, p1x] = getVariable(x, p1, 0)
                const [p1yCol, p1y] = getVariable(x, p1, 1)
                const [p2xCol, p2x] = getVariable(x, p2, 0)
                const [p2yCol, p2y] = getVariable(x, p2, 1)
                setGrad(grad, p1xCol, -2 * (p2x - p1x))
                setGrad(grad, p1yCol, -2 * (p2y - p1y))
                setGrad(grad, p2xCol, 2 * (p2x - p1x))
                setGrad(grad, p2yCol, 2 * (p2y - p1y))
            })

            break
        }

        case ConstraintKind.Horizontal:
            const obj = objects[cons.object]
            if (!obj || obj.kind !== ObjectKind.Line) {
                // TODO: this can also be applied to two points, not just a line
                continue
            }

            addVariable(obj.point1, 1)
            addVariable(obj.point2, 1)

            consFns.push((x) => {
                const [, p1y] = getVariable(x, obj.point1, 1)
                const [, p2y] = getVariable(x, obj.point2, 1)
                return p1y - p2y
            })

            jacFns.push((x, grad) => {
                const [p1yCol] = getVariable(x, obj.point1, 1)
                const [p2yCol] = getVariable(x, obj.point2, 1)
                setGrad(grad, p1yCol, 1)
                setGrad(grad, p2yCol, -1)
            })

            break;

        case ConstraintKind.Vertical: {
            const obj = objects[cons.object]
            if (!obj || obj.kind !== ObjectKind.Line) {
                continue
            }

            addVariable(obj.point1, 0)
            addVariable(obj.point2, 0)

            consFns.push((x) => {
                const [, p1x] = getVariable(x, obj.point1, 0)
                const [, p2x] = getVariable(x, obj.point2, 0)
                return p1x - p2x
            })

            jacFns.push((x, grad) => {
                const [p1xCol] = getVariable(x, obj.point1, 0)
                const [p2xCol] = getVariable(x, obj.point2, 0)
                setGrad(grad, p1xCol, 1)
                setGrad(grad, p2xCol, -1)
            })

            break
        }

        case ConstraintKind.Coincident:
            // Two possibilities: both object1 and object2 are points, or one of them is a point and the other a line
            const obj1 = objects[cons.object1];
            const obj2 = objects[cons.object2];
            if (!obj1 || !obj2) {
                continue
            }

            if (pointLikeObject(obj1.kind) && pointLikeObject(obj2.kind)) {
                // Two points coincident, two equations in p1 = p2

                // FIXME: convergence is too slow, maybe just replace the point ID in the line obj instead of doing it here?

                addVariable(obj1.id, 0)
                addVariable(obj1.id, 1)
                addVariable(obj2.id, 0)
                addVariable(obj2.id, 1)

                consFns.push((x) => {
                    const [, p1x] = getVariable(x, obj1.id, 0)
                    const [, p2x] = getVariable(x, obj2.id, 0)
                    return p1x - p2x
                })

                consFns.push((x) => {
                    const [, p1y] = getVariable(x, obj1.id, 1)
                    const [, p2y] = getVariable(x, obj2.id, 1)
                    return p1y - p2y
                })

                jacFns.push((x, grad) => {
                    const [p1xCol,] = getVariable(x, obj1.id, 0)
                    const [p1yCol,] = getVariable(x, obj1.id, 1)
                    const [p2xCol,] = getVariable(x, obj2.id, 0)
                    const [p2yCol,] = getVariable(x, obj2.id, 1)
                    setGrad(grad, p1xCol, 1)
                    setGrad(grad, p1yCol, 0)
                    setGrad(grad, p2xCol, -1)
                    setGrad(grad, p2yCol, 0)
                })

                jacFns.push((x, grad) => {
                    const [p1xCol,] = getVariable(x, obj1.id, 0)
                    const [p1yCol,] = getVariable(x, obj1.id, 1)
                    const [p2xCol,] = getVariable(x, obj2.id, 0)
                    const [p2yCol,] = getVariable(x, obj2.id, 1)
                    setGrad(grad, p1xCol, 0)
                    setGrad(grad, p1yCol, 1)
                    setGrad(grad, p2xCol, 0)
                    setGrad(grad, p2yCol, -1)
                })
            } else {
                let lineObj;
                let pointObj;
                if (obj1.kind === ObjectKind.Line && pointLikeObject(obj2.kind)) {
                    lineObj = obj1
                    pointObj = obj2
                } else if (pointLikeObject(obj1.kind) && obj2.kind === ObjectKind.Line) {
                    lineObj = obj2
                    pointObj = obj1
                } else {
                    continue
                }

                const a1 = lineObj.point1
                const a2 = lineObj.point2
                const p = pointObj.id

                addVariable(a1, 0)
                addVariable(a1, 1)
                addVariable(a2, 0)
                addVariable(a2, 1)
                addVariable(p, 0)
                addVariable(p, 1)

                consFns.push((x) => {
                    const [, a1x] = getVariable(x, a1, 0)
                    const [, a1y] = getVariable(x, a1, 1)
                    const [, a2x] = getVariable(x, a2, 0)
                    const [, a2y] = getVariable(x, a2, 1)
                    const [, px] = getVariable(x, p, 0)
                    const [, py] = getVariable(x, p, 1)
                    const v1x = a2x - a1x
                    const v1y = a2y - a1y
                    const v2x = px - a1x
                    const v2y = py - a1y
                    return v1x * v2y - v1y * v2x
                })

                jacFns.push((x, grad) => {
                    const [a1xCol, a1x] = getVariable(x, a1, 0)
                    const [a1yCol, a1y] = getVariable(x, a1, 1)
                    const [a2xCol, a2x] = getVariable(x, a2, 0)
                    const [a2yCol, a2y] = getVariable(x, a2, 1)
                    const [pxCol, px] = getVariable(x, p, 0)
                    const [pyCol, py] = getVariable(x, p, 1)
                    setGrad(grad, a1xCol, a1y - py)
                    setGrad(grad, a1yCol, a2y - a1y)
                    setGrad(grad, a2xCol, py - a1y)
                    setGrad(grad, a2yCol, a1x - px)
                    setGrad(grad, pxCol, a1y - a2y)
                    setGrad(grad, pyCol, a2x - a1x)
                })
            }

            break
        }
    }

    newtonSolve(x, consFns, jacFns)

    for (const fn of writeResults) {
        fn(x)
    }
}

function newtonSolve(x: number[], consFns: ((x: number[]) => number)[], jacFns: ((x: number[], grad: number[]) => void)[]) {
    const J = new Matrix(jacFns.length, x.length)
    const F = new Matrix(consFns.length, 1)

    // Intermediate storage
    const Jrow = new Array<number>(J.columns).fill(0)

    const evalJ = (x: number[], J: Matrix) => {
        for (let r = 0; r < J.rows; ++r) {
            Jrow.fill(0)
            jacFns[r](x, Jrow)
            J.setRow(r, Jrow)
        }
    }

    const evalF = (x: number[], F: Matrix) => {
        for (let r = 0; r < F.rows; ++r) {
            F.set(r, 0, -consFns[r](x))
        }
    }

    for (let i = 0; i < 100; ++i) {
        evalJ(x, J)
        evalF(x, F)

        const svd = new SingularValueDecomposition(J, { autoTranspose: true })
        const sol = svd.solve(F)

        for (let r = 0; r < x.length; ++r) {
            x[r] += sol.get(r, 0)
        }
    }
}

function transformViewportToSVG(state: ToolState, point: Vec2D): Vec2D {
    return [
        point[0] + state.viewBox.offset[0],
        point[1] + state.viewBox.offset[1],
    ]
}

export function transformSVGToData(state: ToolState, point: Vec2D): Vec2D {
    return [
        point[0] - state.dataOrigin[0],
        state.dataOrigin[1] - point[1],
    ]
}

export function transformViewportToData(state: ToolState, point: Vec2D): Vec2D {
    return transformSVGToData(state, transformViewportToSVG(state, point))
}

export function transformDataToSVG(state: ToolState, point: Vec2D): Vec2D {
    return [
        point[0] + state.dataOrigin[0],
        state.dataOrigin[1] - point[1],
    ]
}

function executeDataAction(state: DataState, action: Readonly<DataAction>): boolean {
    switch (action.kind) {
    case DataActionKind.AddObject:
        Object.assign(state.objects, action.map);
        return true;
    case DataActionKind.AddConstraint:
        state.constraints.push(action.constraint)

        // TODO: compute constraints!
        transformConstraints(state.objects, state.constraints)

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
                guide: false,
                kind: ObjectKind.Node,
                point: transformViewportToData(toolState, toolState.mousePoint),
            }
            const nextLine: CanvasObject = {
                id: generateID(),
                guide: false,
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
                nextPoint.point = transformViewportToData(toolState, action.point);
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
                guide: false,
                kind: ObjectKind.Path,
                points: [],
                lines: [],
            };
            const nextNode: CanvasObject = {
                id: generateID(),
                guide: false,
                kind: ObjectKind.Node,
                point: transformViewportToData(toolState, toolState.mousePoint),
            }
            const nextPath: CanvasObject = {
                id: generateID(),
                guide: false,
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
                selectedObjects: new Set(),
            }
            return true;

        case ToolKind.Text: {
            const nextNode: CanvasObject = {
                id: generateID(),
                guide: false,
                kind: ObjectKind.Node,
                point: transformViewportToData(toolState, toolState.mousePoint),
            }
            const nextText: CanvasObject = {
                id: generateID(),
                guide: false,
                kind: ObjectKind.Text,
                point: nextNode.id,
                text: '',
            }
            toolState.tool = {
                kind: ToolKind.Text,
                tempObjectMap: {
                    [nextNode.id]: nextNode,
                    [nextText.id]: nextText,
                },
                nextObjectID: nextText.id,
            }
            return true;
        }

        default:
            return false;
        }

    case ToolActionKind.ResizeView: {
        toolState.viewBox.width = action.width / toolState.scale
        toolState.viewBox.height = action.height / toolState.scale
        return true
    }

    case ToolActionKind.SetViewOffset: {
        toolState.viewBox.offset = action.offset
        return true
    }

    case ToolActionKind.StartPan: {
        toolState.pan = {
            kind: PanStateKind.Panning,
            start: transformViewportToSVG(toolState, action.point),
        }
        return true
    }

    case ToolActionKind.StopPan: {
        toolState.pan = {
            kind: PanStateKind.Idle
        }
        return true
    }

    case ToolActionKind.UpdatePan: {
        switch (toolState.pan.kind) {
        case PanStateKind.Panning:
            toolState.viewBox.offset[0] = toolState.pan.start[0] - toolState.mousePoint[0]
            toolState.viewBox.offset[1] = toolState.pan.start[1] - toolState.mousePoint[1]
            return true
        }
        return false
    }

    case ToolActionKind.UpdateNextText:
        switch (toolState.tool.kind) {
        case ToolKind.Text:
            const textObj = toolState.tool.tempObjectMap[toolState.tool.nextObjectID]
            if (!textObj || textObj.kind !== ObjectKind.Text) {
                return false
            }
            const pointObj = toolState.tool.tempObjectMap[textObj.point]
            if (!pointObj || pointObj.kind !== ObjectKind.Node) {
                return false
            }
            textObj.text = action.text
            pointObj.point = transformViewportToData(toolState, action.point)
            return true
        }
        return false

    case ToolActionKind.UpdateMousePoint:
        toolState.mousePoint = action.point;
        return true;

    case ToolActionKind.AddHistory: {
        const copy = JSON.parse(JSON.stringify(action.action))
        appendHistory(toolState, copy);
        return true;
    }

    case ToolActionKind.SelectObject:
        switch (toolState.tool.kind) {
        case ToolKind.Selector:
            toolState.tool.selectedObjects.add(action.objectID);
            return true;
        }
        return false;

    case ToolActionKind.DeselectObject:
        switch (toolState.tool.kind) {
        case ToolKind.Selector:
            if (toolState.tool.selectedObjects.has(action.objectID)) {
                toolState.tool.selectedObjects.delete(action.objectID);
                return true;
            }
            return false;
        }
        return false;
    }
}

function generateAction(toolState: Readonly<ToolState>, dataState: Readonly<DataState>, event: Event): [ToolAction[], DataAction[]] {
    const toolActions: ToolAction[] = [];
    const dataActions: DataAction[] = [];

    switch (event.kind) {
    case EventKind.MouseMove:
        toolActions.push({
            kind: ToolActionKind.UpdateMousePoint,
            point: event.point,
        })

        switch (toolState.pan.kind) {
        case PanStateKind.Panning:
            toolActions.push({
                kind: ToolActionKind.UpdatePan,
            })
            break
        }

        switch (toolState.tool.kind) {
        case ToolKind.Pen:
            toolActions.push({
                kind: ToolActionKind.UpdateNextNode,
                point: event.point,
            });
            break;
        case ToolKind.Text: {
            const textObj = toolState.tool.tempObjectMap[toolState.tool.nextObjectID]
            if (!textObj || textObj.kind !== ObjectKind.Text) {
                break
            }
            toolActions.push({
                kind: ToolActionKind.UpdateNextText,
                text: textObj.text,
                point: event.point
            })
            break
        }
        }

        break;

    case EventKind.MouseDown:
        if (event.button === Button.Secondary) {
            switch (toolState.pan.kind) {
            case PanStateKind.Idle:
                toolActions.push({
                    kind: ToolActionKind.StartPan,
                    point: event.point,
                })
                break
            case PanStateKind.Panning:
                break
            }
            break;
        }

        switch (toolState.tool.kind) {
        case ToolKind.Selector:
            // FIXME: should these be moved to executeToolAction?

            let hitObjID;
            loop: for (const obj of Object.values(dataState.objects)) {
                if (!obj) {
                    continue
                }

                const hitPoint = transformViewportToData(toolState, event.point)

                switch (obj.kind) {
                case ObjectKind.Node:
                case ObjectKind.FixedNode:
                    const hit = hitNode(obj.point, 15, hitPoint)
                    if (hit) {
                        hitObjID = obj.id;
                        break loop;
                    }
                    break;

                case ObjectKind.Line:
                    const point1Obj = dataState.objects[obj.point1]
                    const point2Obj = dataState.objects[obj.point2]
                    if (point1Obj && point2Obj && point1Obj.kind === ObjectKind.Node && point2Obj.kind === ObjectKind.Node) {
                        const hit = hitLineSegment(point1Obj.point, point2Obj.point, 10, hitPoint)
                        if (hit) {
                            hitObjID = obj.id;
                            break loop;
                        }
                    }
                    break;
                }
            }

            if (event.ctrl) {
                if (hitObjID) {
                    toolActions.push({
                        kind: ToolActionKind.DeselectObject,
                        objectID: hitObjID,
                    })
                }
            } else {
                if (hitObjID) {
                    toolActions.push({
                        kind: ToolActionKind.SelectObject,
                        objectID: hitObjID,
                    })
                } else {
                    toolState.tool.selectedObjects.forEach((objID) => {
                        toolActions.push({
                            kind: ToolActionKind.DeselectObject,
                            objectID: objID,
                        })
                    })
                }
            }
            break;

        case ToolKind.Pen:
            toolActions.push({
                kind: ToolActionKind.AddNode,
                point: event.point,
            });
            break;

        case ToolKind.Text: {
            toolActions.push({
                kind: ToolActionKind.SelectTool,
                tool: ToolKind.Selector
            })

            dataActions.push({
                id: generateID(),
                kind: DataActionKind.AddObject,
                map: toolState.tool.tempObjectMap,
            })
            break
        }
        }

        break;

    case EventKind.MouseUp:
        if (event.button === Button.Secondary) {
            switch (toolState.pan.kind) {
            case PanStateKind.Panning:
                toolActions.push({
                    kind: ToolActionKind.StopPan,
                })
                break
            }
            break
        }
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
            switch (toolState.tool.kind) {
            case ToolKind.Pen:
                toolActions.push({
                    kind: ToolActionKind.SelectTool,
                    tool: ToolKind.Selector,
                })

                // Kind of a hack to do it here and mutate the object
                filterObjectMap(toolState.tool.tempObjectMap, [toolState.tool.tempObjectID]);

                dataActions.push({
                    id: generateID(),
                    kind: DataActionKind.AddObject,
                    map: toolState.tool.tempObjectMap,
                })
                break;
            }
            break;
        }
        break;

    case EventKind.KeyUp:
        break;

    case EventKind.ResizeView:
        toolActions.push({
            kind: ToolActionKind.ResizeView,
            width: event.viewWidth,
            height: event.viewHeight,
        })
        break

    case EventKind.SetViewOffset:
        toolActions.push({
            kind: ToolActionKind.SetViewOffset,
            offset: event.offset,
        })
        break

    case EventKind.SelectTextTool:
        toolActions.push({
            kind: ToolActionKind.SelectTool,
            tool: ToolKind.Text,
        })
        break

    case EventKind.SetTextValue:
        toolActions.push({
            kind: ToolActionKind.UpdateNextText,
            text: event.text,
            point: toolState.mousePoint,
        })
        break

    case EventKind.AddPerpendicularConstraint:
        switch (toolState.tool.kind) {
        case ToolKind.Selector:
            if (toolState.tool.selectedObjects.size !== 2) {
                console.log('must select 2 objects to add constraints')
                break;
            }

            const objectIDs = Array.from(toolState.tool.selectedObjects);

            dataActions.push({
                id: generateID(),
                kind: DataActionKind.AddConstraint,
                constraint: {
                    kind: ConstraintKind.Perpendicular,
                    line1: objectIDs[0],
                    line2: objectIDs[1],
                }
            })
            break;
        }
        break;

    case EventKind.AddCoincidentConstraint:
        switch (toolState.tool.kind) {
        case ToolKind.Selector:
            if (toolState.tool.selectedObjects.size !== 2) {
                console.log('must select 2 objects to add constraints')
                break;
            }

            const objectIDs = Array.from(toolState.tool.selectedObjects)

            dataActions.push({
                id: generateID(),
                kind: DataActionKind.AddConstraint,
                constraint: {
                    kind: ConstraintKind.Coincident,
                    object1: objectIDs[0],
                    object2: objectIDs[1],
                }
            })
            break;
        }
        break;

    case EventKind.AddHorizontalConstraint:
        switch (toolState.tool.kind) {
        case ToolKind.Selector:
            if (toolState.tool.selectedObjects.size !== 1) {
                console.log('must select 1 object for the horizontal constraint')
                break
            }

            const objectIDs = Array.from(toolState.tool.selectedObjects)

            dataActions.push({
                id: generateID(),
                kind: DataActionKind.AddConstraint,
                constraint: {
                    kind: ConstraintKind.Horizontal,
                    object: objectIDs[0],
                }
            })
            break;
        }
        break;

    case EventKind.AddVerticalConstraint:
        switch (toolState.tool.kind) {
        case ToolKind.Selector:
            if (toolState.tool.selectedObjects.size !== 1) {
                console.log('must select 1 object for the vertical constraint')
                break
            }

            const objectIDs = Array.from(toolState.tool.selectedObjects)

            dataActions.push({
                id: generateID(),
                kind: DataActionKind.AddConstraint,
                constraint: {
                    kind: ConstraintKind.Vertical,
                    object: objectIDs[0]
                }
            })
            break
        }
        break

    case EventKind.AddDistanceConstraint:
        switch (toolState.tool.kind) {
        case ToolKind.Selector:
            if (toolState.tool.selectedObjects.size !== 1 && toolState.tool.selectedObjects.size !== 2) {
                console.log('must select 1 line, or two points')
                break
            }

            const objectIDs = Array.from(toolState.tool.selectedObjects)

            dataActions.push({
                id: generateID(),
                kind: DataActionKind.AddConstraint,
                constraint: {
                    kind: ConstraintKind.Distance,
                    distance: event.distance,
                    object1: objectIDs[0],
                    object2: objectIDs[1],
                }
            })

            break
        }
        break

    case EventKind.AddObject: {
        const obj: CanvasObject = {
            id: generateID(),
            guide: event.guide,
            ...event.object,
        }
        const tmpMap = {
            [obj.id]: obj
        }
        dataActions.push({
            id: generateID(),
            kind: DataActionKind.AddObject,
            map: tmpMap,
        })
        break
    }
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
    private toolState = this.initialToolState()

    private dataState = this.initialDataState()

    private listeners: Set<StateChangeListener> = new Set();

    private initialToolState(): ToolState {
        return {
            tool: {
                kind: ToolKind.Selector,
                selectedObjects: new Set(),
            },
            history: {},
            mousePoint: [0, 0],
            viewBox: {
                offset: [0, 0],
                width: 0,
                height: 0,
            },
            dataOrigin: [0, 0],
            scale: 1,
            pan: {
                kind: PanStateKind.Idle
            }
        };
    }

    private initialDataState(): DataState {
        return {
            objects: {},
            constraints: [],
        }
    }

    public resetTool() {
        this.toolState = this.initialToolState()
        this.notifyListeners()
    }

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

    private notifyListeners() {
        const changeEv = {
            state: this.toolState,
        }
        this.listeners.forEach((v) => {
            v(changeEv);
        })
    }

    public sendEvent(event: Event) {
        const [toolActions, dataActions] = generateAction(this.toolState, this.dataState, event);

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

        this.notifyListeners()
    }
}
