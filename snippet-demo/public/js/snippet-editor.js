(() => {

    const form = document.forms[0];

    let editTimeoutHandle;        

    form.addEventListener("input", e => {
        clearTimeout(editTimeoutHandle);
        editTimeoutHandle = setTimeout(() => form.submit(), 1000);
    });

    form.submit();

})();