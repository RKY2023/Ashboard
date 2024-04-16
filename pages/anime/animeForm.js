const AnimeForm = () => {
    const handleSubmit = () => {

    }

    return (
        <>
        <form onSubmit={handleSubmit}>
            <label>
            Name:
            <input type="text" value={'ss'} />
            </label>
            <input type="submit" value="Submit" />
        </form>
        </>
    );
};
export default AnimeForm;