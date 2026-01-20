/**
 * Usage: <div use:portal={'body'}> or <div use:portal={document.body}>
 *
 * @param node
 * @param target
 */
export function portal(node: HTMLElement, target: HTMLElement | string = 'body') {
    let targetEl;

    function update(newTarget: HTMLElement | string) {
        target = newTarget;
        targetEl = typeof target === 'string' ? document.querySelector(target) : target;
        if (targetEl) {
            targetEl.appendChild(node);
        }
    }

    function destroy() {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }

    update(target);

    return {
        update,
        destroy
    };
}
