module.exports = function (alphabet) {

    const encodingAlphabet = [...alphabet];

    const encodingAlphabetLength = encodingAlphabet.length;

    return {
        encode: function (number) {
            let output = [];
            while (number > 0) {
                output.unshift(encodingAlphabet[number % encodingAlphabetLength]);
                number = Math.floor(number / encodingAlphabetLength);
            }
            return output.join("");
        },
        decode: function (encoded) {
            return [...encoded].reverse().reduce((p, c, i) => {
                return p + encodingAlphabet.indexOf(c) * Math.pow(encodingAlphabetLength, i);
            }, 0);
        }
    };
};