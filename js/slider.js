const defaultThreshold = 60;
const defaultVerticalTolerance = 40;
const transitionMs = 180;

export function init({ element, canSlide, onSlide, threshold = defaultThreshold, verticalTolerance = defaultVerticalTolerance }) {
    let start;
    let tracking = false;
    let sliding = false;
    let currentX = 0;

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
        setTransition(true);
        setTranslate(-direction * element.offsetWidth);

        setTimeout(() => {
            setTransition(false);
            setTranslate(direction * element.offsetWidth);
            onSlide(direction);
            void element.offsetHeight;

            setTransition(true);
            setTranslate(0);
            setTimeout(reset, transitionMs);
        }, transitionMs);
    }

    function snapBack() {
        if (!tracking && !currentX) {
            return;
        }

        tracking = false;
        setTransition(true);
        setTranslate(0);
        setTimeout(reset, transitionMs);
    }

    function reset() {
        start = undefined;
        tracking = false;
        sliding = false;
        currentX = 0;
        setTransition(false);
        setTranslate(0);
    }

    function setTransition(value) {
        element.style.transition = value ? `transform ${transitionMs}ms ease-out, opacity ${transitionMs}ms ease-out` : "";
    }

    function setTranslate(value) {
        element.style.transform = `translateX(${value}px)`;
        element.style.opacity = Math.max(.65, 1 - Math.abs(value) / Math.max(element.offsetWidth, 1) * .35);
    }
}
