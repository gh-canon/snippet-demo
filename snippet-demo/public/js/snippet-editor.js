(() => {

    let editTimeoutHandle;

    document.querySelector("form").addEventListener("input", e => {
        clearTimeout(editTimeoutHandle);
        editTimeoutHandle = setTimeout(() => document.forms[0].submit(), 1000);
    });

    document.forms[0].submit();

})();