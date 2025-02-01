let start = 0;
let stop = 0;
let swiping;
let shouldSwipe;
let ready;
let subscribed;
let onRelease;
const swipeTheshold = 20;
const maxSwipe = 100;
const refresh = document.querySelector('.refresh');
const state = refresh.querySelector('div');

export function onRefresh(action) {
    onRelease = action;
    if (subscribed) {
        return;
    }
    document.addEventListener("touchstart", swipeStart, { passive: false });
    document.addEventListener("touchmove", swipeProgress, { passive: false });
    document.addEventListener("touchend", swipeEnd, { passive: false });
}

function swipeStart(e) {
    shouldSwipe = getScroll() === 0;
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

function swipeEnd(e) {
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
    if (swiping)
        e.preventDefault();
    if (ready) {
        onRelease();
    }
}

function swipeProgress(e) {
    if (!shouldSwipe) {
        return;
    }
    shouldSwipe = getScroll() === 0;
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
    if (swiping)
        e.preventDefault();
}

function pullDown() {
    let swipe = stop - start;
    if (!swiping) {
        if (swipe <= swipeTheshold) {
            return;
        }
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
    state.innerHTML = ready ? 'Release to refresh' : 'Contunue pulling...';
}

function move(swipe) {
    refresh.style.height = swipe + 'px';
}

function getScroll() {
    return document.documentElement.scrollTop || document.body.scrollTop || 0;
}
