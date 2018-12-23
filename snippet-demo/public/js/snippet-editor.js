(() => {

    const form = document.forms[0];

    form.addEventListener("keydown", e => {
        if (e.ctrlKey && e.shiftKey) {
            switch (e.which) {
                case 69:
                    e.preventDefault();
                    form.submit();
                    break;
                case 88:
                    e.preventDefault();
                    form.reset();
                    break;
            }
        }
    });

    form.submit();

})();