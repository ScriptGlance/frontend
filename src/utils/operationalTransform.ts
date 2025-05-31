import {OperationComponent, OperationType} from "../api/socket/presentationPartsSocketManager";

const LOG_PREFIX = "[OT DEBUG]";

const opsToString = (ops: OperationComponent[] | OperationComponent | null): string => {
    if (!ops) return "null";
    return JSON.stringify(ops);
};

export const deepClone = <T, >(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
};

export const applyOps = (text: string, ops: OperationComponent[], callContext: string = ""): string => {
    console.log(`${LOG_PREFIX} applyOps (${callContext}) | Initial Text: "${text}" | Ops: ${opsToString(ops)}`);
    let result = '';
    let idx = 0;

    for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        console.log(`${LOG_PREFIX} applyOps (${callContext}) | Processing op [${i}]: ${opsToString(op)} | Current Idx: ${idx} | Current Result: "${result}"`);
        if (op.type === OperationType.Retain) {
            const count = op.count ?? 0;
            if (idx + count > text.length) {
                console.warn(`${LOG_PREFIX} applyOps (${callContext}) | Retain out of bounds: Op ${opsToString(op)}, textLen: ${text.length}, idx: ${idx}. Retaining rest.`);
                result += text.slice(idx);
                idx = text.length;
            } else {
                result += text.slice(idx, idx + count);
                idx += count;
            }
            console.log(`${LOG_PREFIX} applyOps (${callContext}) | After Retain: Idx: ${idx}, Result: "${result}"`);
        } else if (op.type === OperationType.Insert) {
            const textToInsert = op.text ?? '';
            result += textToInsert;
            console.log(`${LOG_PREFIX} applyOps (${callContext}) | After Insert ("${textToInsert}"): Idx: ${idx} (unchanged), Result: "${result}"`);
        } else if (op.type === OperationType.Delete) {
            const count = op.count ?? 0;
            const originalIdx = idx;
            if (idx + count > text.length) {
                console.warn(`${LOG_PREFIX} applyOps (${callContext}) | Delete out of bounds: Op ${opsToString(op)}, textLen: ${text.length}, idx: ${idx}. Deleting rest.`);
                idx = text.length;
            } else {
                idx += count;
            }
            console.log(`${LOG_PREFIX} applyOps (${callContext}) | After Delete (moved idx from ${originalIdx} to ${idx}): Result: "${result}" (unchanged by delete itself)`);
        }
    }

    if (idx < text.length) {
        const tail = text.slice(idx);
        console.log(`${LOG_PREFIX} applyOps (${callContext}) | Appending tail: "${tail}" | Final Idx before append: ${idx} | Text Length: ${text.length}`);
        result += tail;
    }
    console.log(`${LOG_PREFIX} applyOps (${callContext}) | Final Result: "${result}"`);
    return result;
};

export const createOps = (oldText: string, newText: string, userId: number): OperationComponent[] => {
    console.log(`${LOG_PREFIX} createOps | Old Text: "${oldText}" | New Text: "${newText}"`);
    let start = 0;
    const oldLen = oldText.length;
    const newLen = newText.length;
    while (start < oldLen && start < newLen && oldText[start] === newText[start]) start++;
    console.log(`${LOG_PREFIX} createOps | Common prefix length (start): ${start}`);

    let oldEnd = oldLen, newEnd = newLen;
    while (oldEnd > start && newEnd > start && oldText[oldEnd - 1] === newText[newEnd - 1]) {
        oldEnd--;
        newEnd--;
    }
    console.log(`${LOG_PREFIX} createOps | Common suffix identified. oldEnd: ${oldEnd}, newEnd: ${newEnd}`);

    const ops: OperationComponent[] = [];
    if (start > 0) {
        ops.push({type: OperationType.Retain, count: start, userId });
        console.log(`${LOG_PREFIX} createOps | Added Retain (prefix): ${opsToString(ops[ops.length - 1])}`);
    }
    if (oldEnd > start) {
        ops.push({type: OperationType.Delete, count: oldEnd - start, userId});
        console.log(`${LOG_PREFIX} createOps | Added Delete: ${opsToString(ops[ops.length - 1])}`);
    }
    const insText = newText.slice(start, newEnd);
    if (insText) {
        ops.push({type: OperationType.Insert, text: insText, userId});
        console.log(`${LOG_PREFIX} createOps | Added Insert: ${opsToString(ops[ops.length - 1])}`);
    }

    const remainingOldLength = oldLen - oldEnd;
    if (remainingOldLength > 0) {
        ops.push({type: OperationType.Retain, count: remainingOldLength, userId});
        console.log(`${LOG_PREFIX} createOps | Added Retain (suffix): ${opsToString(ops[ops.length - 1])}`);
    }
    console.log(`${LOG_PREFIX} createOps | Final Ops: ${opsToString(ops)}`);
    return ops;
};


export const transform = (opsA: OperationComponent[], opsB: OperationComponent[], A_id: string = "A", B_id: string = "B"): OperationComponent[] => {
    console.log(`${LOG_PREFIX} transform | Transforming ops${A_id}: ${opsToString(opsA)} | Against ops${B_id}: ${opsToString(opsB)}`);

    const a: OperationComponent[] = deepClone(opsA);
    const b: OperationComponent[] = deepClone(opsB);

    const resOpsA: OperationComponent[] = [];

    let idxA = 0;
    let idxB = 0;
    let iter = 0;

    while (idxA < a.length || idxB < b.length) {
        iter++;
        const opA = idxA < a.length ? a[idxA] : null;
        const opB = idxB < b.length ? b[idxB] : null;
        console.log(`${LOG_PREFIX} transform (Iter ${iter}) | op${A_id} [${idxA}]: ${opsToString(opA)} | op${B_id} [${idxB}]: ${opsToString(opB)}`);


        if (opA && opA.type === OperationType.Insert && opB && opB.type === OperationType.Insert) {
            if ((opA.userId || 0) <= (opB.userId || 0)) {
                resOpsA.push(deepClone(opA));
                idxA++;
            } else {
                resOpsA.push({
                    type: OperationType.Retain,
                    count: opB.text?.length || 0,
                });
                idxB++;
            }
            continue;
        }

        if (opA && opA.type === OperationType.Insert) {
            resOpsA.push(deepClone(opA));
            idxA++;
            continue;
        }

        if (opB && opB.type === OperationType.Insert) {
            resOpsA.push({
                type: OperationType.Retain,
                count: opB.text?.length || 0,
            });

            idxB++;
            continue;
        }

        if (!opA && !opB) {
            console.log(`${LOG_PREFIX} transform (Iter ${iter}) | Both op streams exhausted.`);
            break;
        }

        if (!opA && opB) {
            console.log(`${LOG_PREFIX} transform (Iter ${iter}) | op${A_id} exhausted. op${B_id} (${opsToString(opB)}) is Retain/Delete, doesn't affect resOps${A_id}. Consuming op${B_id}.`);
            idxB++;
            continue;
        }
        if (opA && !opB) {
            console.log(`${LOG_PREFIX} transform (Iter ${iter}) | op${B_id} exhausted. op${A_id} (${opsToString(opA)}) is Retain/Delete. Pushing to resOps${A_id}.`);
            resOpsA.push(deepClone(opA));
            idxA++;
            console.log(`${LOG_PREFIX} transform (Iter ${iter}) | resOps${A_id} now: ${opsToString(resOpsA)}`);
            continue;
        }

        if (!opA || !opB) {
            console.error(`${LOG_PREFIX} transform (Iter ${iter}) | Unreachable state: opA or opB is null when both should be Retain/Delete. opA: ${opsToString(opA)}, opB: ${opsToString(opB)}`);
            break;
        }
        console.log(`${LOG_PREFIX} transform (Iter ${iter}) | Case 3: Both op${A_id} (${opA.type}) and op${B_id} (${opB.type}) are Retain or Delete.`);

        const lenA = opA.count ?? 0;
        const lenB = opB.count ?? 0;
        const minLen = Math.min(lenA, lenB);
        console.log(`${LOG_PREFIX} transform (Iter ${iter}) | len${A_id}: ${lenA}, len${B_id}: ${lenB}, minLen: ${minLen}`);

        if (opA.type === OperationType.Retain && opB.type === OperationType.Retain) {
            if (minLen > 0) {
                resOpsA.push({type: OperationType.Retain, count: minLen});
                console.log(`${LOG_PREFIX} transform (Iter ${iter}) | Both Retain. Added Retain(${minLen}) to resOps${A_id}.`);
            }
        } else if (opA.type === OperationType.Delete && opB.type === OperationType.Retain) {
            if (minLen > 0) {
                resOpsA.push({type: OperationType.Delete, count: minLen});
                console.log(`${LOG_PREFIX} transform (Iter ${iter}) | op${A_id} Delete, op${B_id} Retain. Added Delete(${minLen}) to resOps${A_id}.`);
            }
        } else if (opA.type === OperationType.Retain && opB.type === OperationType.Delete) {
            console.log(`${LOG_PREFIX} transform (Iter ${iter}) | op${A_id} Retain, op${B_id} Delete. resOps${A_id} does nothing for this segment.`);
        } else if (opA.type === OperationType.Delete && opB.type === OperationType.Delete) {
            console.log(`${LOG_PREFIX} transform (Iter ${iter}) | Both Delete. resOps${A_id} does nothing for this segment.`);
        }
        console.log(`${LOG_PREFIX} transform (Iter ${iter}) | resOps${A_id} after Retain/Delete handling: ${opsToString(resOpsA)}`);


        if (opA.count !== undefined) opA.count -= minLen;
        if (opB.count !== undefined) opB.count -= minLen;
        console.log(`${LOG_PREFIX} transform (Iter ${iter}) | Consumed ${minLen}. op${A_id}.count: ${opA.count}, op${B_id}.count: ${opB.count}`);


        if (opA.count === 0) {
            idxA++;
            console.log(`${LOG_PREFIX} transform (Iter ${iter}) | op${A_id} consumed. idx${A_id} now ${idxA}.`);
        }
        if (opB.count === 0) {
            idxB++;
            console.log(`${LOG_PREFIX} transform (Iter ${iter}) | op${B_id} consumed. idx${B_id} now ${idxB}.`);
        }
    }
    console.log(`${LOG_PREFIX} transform | Raw resOps${A_id} before optimization: ${opsToString(resOpsA)}`);

    const optimized: OperationComponent[] = [];
    for (let i = 0; i < resOpsA.length; i++) {
        const currentOp = resOpsA[i];
        console.log(`${LOG_PREFIX} transform | Optimizing op [${i}]: ${opsToString(currentOp)}`);

        if ((currentOp.type === OperationType.Retain || currentOp.type === OperationType.Delete) && (!currentOp.count || currentOp.count === 0)) {
            console.log(`${LOG_PREFIX} transform | Skipping zero-count Retain/Delete: ${opsToString(currentOp)}`);
            continue;
        }
        if (currentOp.type === OperationType.Insert && (!currentOp.text || currentOp.text === '')) {
            console.log(`${LOG_PREFIX} transform | Skipping empty Insert: ${opsToString(currentOp)}`);
            continue;
        }

        if (optimized.length > 0) {
            const lastOp = optimized[optimized.length - 1];
            console.log(`${LOG_PREFIX} transform | Comparing with last optimized op: ${opsToString(lastOp)}`);
            if (lastOp.type === currentOp.type) {
                if (currentOp.type === OperationType.Insert) {
                    if (lastOp.text !== undefined && currentOp.text !== undefined) {
                        lastOp.text += currentOp.text;
                        console.log(`${LOG_PREFIX} transform | Merged Insert. Last op now: ${opsToString(lastOp)}`);
                        continue;
                    }
                } else {
                    if (lastOp.count !== undefined && currentOp.count !== undefined) {
                        lastOp.count += currentOp.count;
                        console.log(`${LOG_PREFIX} transform | Merged ${lastOp.type}. Last op now: ${opsToString(lastOp)}`);
                        continue;
                    }
                }
            }
        }
        optimized.push(currentOp);
        console.log(`${LOG_PREFIX} transform | Added to optimized: ${opsToString(currentOp)}. Optimized now: ${opsToString(optimized)}`);
    }
    console.log(`${LOG_PREFIX} transform | Final Optimized resOps${A_id}: ${opsToString(optimized)}`);
    return optimized;
};


export function transformPosition(ops: OperationComponent[], position: number, callContext: string = ""): number {
    console.log(`${LOG_PREFIX} transformPosition (${callContext}) | Ops: ${opsToString(ops)} | Initial Position: ${position}`);
    let currentPosition = position;
    let textIndex = 0;

    for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        const oldTextIndex = textIndex;
        const oldCurrentPosition = currentPosition;
        console.log(`${LOG_PREFIX} transformPosition (${callContext}) | Processing op [${i}]: ${opsToString(op)} | Current Pos: ${currentPosition} | TextIndex: ${textIndex}`);

        if (op.type === OperationType.Retain) {
            const retainCount = op.count ?? 0;
            textIndex += retainCount;
            console.log(`${LOG_PREFIX} transformPosition (${callContext}) | After Retain(${retainCount}): New Pos: ${currentPosition} (unchanged by retain), New TextIndex: ${textIndex}`);
        } else if (op.type === OperationType.Insert) {
            const insertLength = op.text?.length ?? 0;
            if (textIndex <= currentPosition) {
                currentPosition += insertLength;
            }
            console.log(`${LOG_PREFIX} transformPosition (${callContext}) | After Insert("${op.text}"): New Pos: ${currentPosition}, New TextIndex: ${textIndex} (unchanged by insert)`);
        } else if (op.type === OperationType.Delete) {
            const deleteCount = op.count ?? 0;
            if (currentPosition > textIndex + deleteCount) {
                currentPosition -= deleteCount;
            } else if (currentPosition > textIndex && currentPosition <= textIndex + deleteCount) {
                currentPosition = textIndex;
            }
            textIndex += deleteCount;
            console.log(`${LOG_PREFIX} transformPosition (${callContext}) | After Delete(${deleteCount}): New Pos: ${currentPosition}, New TextIndex: ${textIndex}`);
        }
        if (oldTextIndex === textIndex && oldCurrentPosition === currentPosition && op.type !== OperationType.Insert) {}
    }
    const finalPosition = Math.max(0, currentPosition);
    console.log(`${LOG_PREFIX} transformPosition (${callContext}) | Original Pos: ${position}, Final Calculated Pos: ${currentPosition}, Returned Pos: ${finalPosition}`);
    return finalPosition;
}
