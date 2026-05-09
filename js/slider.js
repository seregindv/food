const defaultThreshold = 60;
const defaultVerticalTolerance = 40;
const transitionMs = 180;

export function init({ element, canSlide, onPreview, onSlide, threshold = defaultThreshold, verticalTolerance = defaultVerticalTolerance }) {
    const viewport = wrap(element);
    let start;
    let tracking = false;
    let sliding = false;
    let currentX = 0;
    let preview;
    let previewDirection;

    element.style.willChange = "transform, opacity";
    element.style.touchAction = "pan-y";

    element.addEventListener("touchstart", e => {
        if (sliding) {
            return;
        }

        if (e.touches.length !== 1) {
            reset();
            return;
        }

        const touch = e.touches[0];
        start = { x: touch.clientX, y: touch.clientY };
        tracking = true;
        currentX = 0;
        setTransition(false);
    }, { passive: true });

    element.addEventListener("touchmove", e => {
        if (!tracking || sliding || e.touches.length !== 1) {
            return;
        }

        const touch = e.touches[0];
        const x = touch.clientX - start.x;
        const y = touch.clientY - start.y;

        if (Math.abs(y) > Math.abs(x) && Math.abs(y) > verticalTolerance) {
            snapBack();
            return;
        }

        if (Math.abs(y) > verticalTolerance) {
            return;
        }

        const direction = x < 0 ? 1 : -1;
        const allowed = canSlide(direction);
        currentX = allowed ? x : x / 3;
        setPreview(direction, allowed);
        setTranslate(currentX);

        if (Math.abs(x) > 8 && e.cancelable) {
            e.preventDefault();
        }
    }, { passive: false });

    element.addEventListener("touchend", () => {
        if (!tracking || sliding) {
            return;
        }

        const direction = currentX < 0 ? 1 : -1;
        if (Math.abs(currentX) >= threshold && canSlide(direction)) {
            slideTo(direction);
        } else {
            snapBack();
        }
    });

    element.addEventListener("touchcancel", snapBack);

    function slideTo(direction) {
        sliding = true;
        tracking = false;
        setPreview(direction, true);
        setTransition(true);
        setTranslate(-direction * element.offsetWidth);

        setTimeout(() => {
            setTransition(false);
            onSlide(direction);
            setTranslate(0);
            removePreview();
            reset();
        }, transitionMs);
    }

    function snapBack() {
        if (!tracking && !currentX) {
            return;
        }

        tracking = false;
        setTransition(true);
        setTranslate(0);
        setTimeout(() => {
            removePreview();
            reset();
        }, transitionMs);
    }

    function reset() {
        start = undefined;
        tracking = false;
        sliding = false;
        currentX = 0;
        setTransition(false);
        removePreview();
        setTranslate(0);
    }

    function setTransition(value) {
        element.style.transition = value ? `transform ${transitionMs}ms ease-out, opacity ${transitionMs}ms ease-out` : "";
        if (preview) {
            preview.style.transition = element.style.transition;
        }
    }

    function setTranslate(value) {
        element.style.transform = `translateX(${value}px)`;
        element.style.opacity = Math.max(.65, 1 - Math.abs(value) / Math.max(element.offsetWidth, 1) * .35);
        if (preview) {
            preview.style.transform = `translateX(${value + previewDirection * element.offsetWidth}px)`;
            preview.style.opacity = Math.min(1, .65 + Math.abs(value) / Math.max(element.offsetWidth, 1) * .35);
        }
    }

    function setPreview(direction, allowed) {
        if (!allowed) {
            removePreview();
            return;
        }

        if (preview && previewDirection === direction) {
            return;
        }

        removePreview();
        previewDirection = direction;
        preview = element.cloneNode(true);
        preview.removeAttribute("id");
        stripIds(preview);
        preview.setAttribute("aria-hidden", "true");
        preview.style.position = "absolute";
        preview.style.inset = "0";
        preview.style.width = "100%";
        preview.style.pointerEvents = "none";
        preview.style.willChange = "transform, opacity";
        preview.style.transform = `translateX(${direction * element.offsetWidth}px)`;
        preview.style.opacity = ".65";
        viewport.appendChild(preview);
        onPreview && onPreview(direction, preview);
        viewport.style.height = `${Math.max(element.offsetHeight, preview.scrollHeight)}px`;
    }

    function removePreview() {
        if (!preview) {
            return;
        }

        preview.remove();
        preview = undefined;
        previewDirection = undefined;
        viewport.style.height = "";
    }
}

function wrap(element) {
    const viewport = document.createElement("div");
    viewport.style.position = "relative";
    viewport.style.overflow = "hidden";
    viewport.style.width = "100%";
    element.parentNode.insertBefore(viewport, element);
    viewport.appendChild(element);
    return viewport;
}

function stripIds(element) {
    element.querySelectorAll("[id]").forEach(e => e.removeAttribute("id"));
    element.querySelectorAll("label[for]").forEach(e => e.removeAttribute("for"));
}
