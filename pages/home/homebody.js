import { Table } from "react-bootstrap";

const HomeBody = () => {
    return (
        <>
        <div className="m-5">
            <Table>
                <thead>
                    <tr>
                        <th>List</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <a href="https://pingtestlive.com/dota-2" role="button">Dota 2 Ping Test</a>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <a href="/jsnotes" role="button">JS - Programming language notes</a>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <a href="/myprojects" role="button">Projects</a>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <a href="/jsnotes" role="button">My Website</a>
                        </td>
                    </tr>
                </tbody>
            </Table>
        {/* <Finance /> */}
        </div>
        </>
    );
};
export default HomeBody;