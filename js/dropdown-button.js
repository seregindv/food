export function init(dropdown) {
    const toggle = dropdown.querySelector("[data-dropdown-toggle]");
    const menu = dropdown.querySelector("[data-dropdown-menu]");
    const defaultButton = dropdown.querySelector(".dropdown-button-main .button");
    let longTapTimer;
    let suppressClick = false;

    toggle.addEventListener("click", e => {
        e.preventDefault();
        e.stopPropagation();
        setOpen(dropdown, menu, toggle, !dropdown.classList.contains("open"));
    });

    menu.addEventListener("click", e => {
        if (e.target.closest(".dropdown-button-item")) {
            close(dropdown);
        }
    });

    defaultButton.addEventListener("pointerdown", e => {
        if (e.pointerType !== "touch") {
            return;
        }
        longTapTimer = setTimeout(() => {
            suppressClick = true;
            setOpen(dropdown, menu, toggle, true);
        }, 500);
    });

    defaultButton.addEventListener("pointerup", () => clearTimeout(longTapTimer));
    defaultButton.addEventListener("pointercancel", () => clearTimeout(longTapTimer));
    defaultButton.addEventListener("pointerleave", () => clearTimeout(longTapTimer));
    defaultButton.addEventListener("click", e => {
        if (!suppressClick) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        suppressClick = false;
    });

    document.addEventListener("click", e => {
        if (!dropdown.contains(e.target)) {
            close(dropdown);
        }
    });
}

function setOpen(dropdown, menu, toggle, open) {
    dropdown.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open.toString());
    menu.hidden = !open;
}

function close(dropdown) {
    setOpen(
        dropdown,
        dropdown.querySelector("[data-dropdown-menu]"),
        dropdown.querySelector("[data-dropdown-toggle]"),
        false);
}
