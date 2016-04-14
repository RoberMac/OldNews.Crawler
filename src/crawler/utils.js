const nowHourMs = () => {
    const date = new Date();
    return +new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours()
    );
};

module.exports = {
    nowHourMs,
};
