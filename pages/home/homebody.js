import { Table } from "react-bootstrap";
import Moon from "./moon";

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
                </tbody>
            </Table>
        {/* <Finance /> */}
        <Moon />
        </div>
        </>
    );
};
export default HomeBody;