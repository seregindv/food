let start = 0;
let stop = 0;
let swiping;
let shouldSwipe;
let ready;
let subscribed;
let onRelease;
const maxSwipe = 100;
const refresh = document.querySelector('.refresh');
const state = refresh.querySelector('div');

export function onRefresh(action) {
    onRelease = action;
    if (subscribed) {
        return;
    }
    document.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: false });
}

function onTouchStart(e) {
    shouldSwipe = window.scrollY === 0;
    if (!shouldSwipe) {
        return;
    }
    swiping = false;
    ready = false;
    updateStatus();
    if ("targetTouches" in e) {
        var touch = e.targetTouches[0];
        start = touch.screenY;
    } else {
        start = e.screenY;
    }
}

function onTouchEnd(e) {
    if (!shouldSwipe) {
        return;
    }
    if ("changedTouches" in e) {
        var touch = e.changedTouches[0];
        stop = touch.screenY;
    } else {
        stop = e.screenY;
    }

    move(0);
    if (ready) {
        onRelease();
    }
}

function onTouchMove(e) {
    if (!shouldSwipe) {
        return;
    }
    shouldSwipe = window.scrollY === 0;
    if (!shouldSwipe) {
        return;
    }
    if ("changedTouches" in e) {
        var touch = e.changedTouches[0];
        stop = touch.screenY;
    } else {
        stop = e.screenY;
    }

    pullDown();
    if (e.cancelable) {
        e.preventDefault();
    }
}

function pullDown() {
    let swipe = stop - start;
    if (!swiping) {
        swiping = true;
    }
    if (swipe < 0)
        swipe = 0;
    else if (swipe >= maxSwipe) {
        swipe = maxSwipe;
        if (!ready) {
            ready = true;
            updateStatus();
        }
    } else if (ready) {
        ready = false;
        updateStatus();
    }
    move(swipe);
}

function updateStatus() {
    state.innerHTML = ready ? 'Release to refresh' : 'Pull to refresh';
}

function move(swipe) {
    refresh.style.height = swipe + 'px';
}
