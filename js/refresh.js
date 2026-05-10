let start = 0;
let swiping;
let shouldSwipe;
let ready;
let subscribed;
let onRelease;
let onSwiping;
let onSwipeStart;
let supportsTouch = typeof window !== 'undefined' && 'ontouchstart' in window;
let maxSwipe = 100;
const horizontalThreshold = 10;

export function init({ onStart, onAction, onNotSupported, onMoving, threshold }) {
    if (supportsTouch) {
        if (!subscribed) {
            document.addEventListener("touchstart", onTouchStart);
            document.addEventListener("touchmove", onTouchMove, { passive: false });
            document.addEventListener("touchend", onTouchEnd);
        }
        onRelease = onAction;
        if (threshold) {
            maxSwipe = threshold;
        }
        onSwiping = onMoving;
        onSwipeStart = onStart;

    } else {
        onNotSupported && onNotSupported();
    }
}

function onTouchStart(e) {
    shouldSwipe = window.scrollY === 0 && e.touches.length === 1;
    if (!shouldSwipe && swiping) {
        move(0);
    }
    swiping = false;
    ready = false;
    if (onSwipeStart) {
        const e = {};
        onSwipeStart(e);
        if (e.cancel) {
            return;
        }
    }
    start = getTouchPosition(e);
}

async function onTouchEnd(e) {
    if (!swiping) {
        return;
    }
    if (ready && onRelease) {
        await onRelease();
    }
    move(0);
}

function onTouchMove(e) {
    if (!shouldSwipe) {
        return;
    }

    const stop = getTouchPosition(e);
    const horizontalSwipe = Math.abs(stop.x - start.x);
    const swipe = stop.y - start.y;
    if (!swiping && horizontalSwipe > horizontalThreshold && horizontalSwipe > Math.abs(swipe)) {
        shouldSwipe = false;
        return;
    }
    if (swipe < 0) {
        if (!swiping) {
            shouldSwipe = false;
            return;
        } else if (start.y > stop.y) {
            start = stop;
        }
    }
    else if (swipe > maxSwipe) {
        start.y = stop.y - maxSwipe;
    }

    pullDown(swipe);
    if (e.cancelable) {
        e.preventDefault();
    }
}

function getTouchPosition(e) {
    return { x: e.touches[0].screenX, y: e.touches[0].screenY };
}

function pullDown(swipe) {
    if (!swiping) {
        swiping = true;
    }
    if (swipe < 0)
        swipe = 0;
    else if (swipe >= maxSwipe) {
        swipe = maxSwipe;
        ready = true;
    } else {
        ready = false;
    }
    move(swipe);
}

function move(swipe) {
    onSwiping && onSwiping({ ready, swipe, threshold: maxSwipe });
}
