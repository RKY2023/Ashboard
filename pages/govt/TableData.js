import React, { useState, useCallback, useEffect } from 'react';
import { Table} from 'react-bootstrap';

const TableData = (props) => {
    const [data, setData] = useState([]);
    const [records, setRecords] = useState([]);
    const [isDataFetched, setIsDataFetched] = useState(false);
    const [tableHeader, setTableHeader] = useState([]);
    const fetchGovtData = useCallback( async () => {
        try{
            const response = await fetch(props.url);
            const data = await response.json();
            setData(data);
            setRecords(data.records);
            const loadedHeader = [];
            for(const k in data.records){
                loadedHeader.push(data.field[k].id);
            }
            setTableHeader(loadedHeader);
            setIsDataFetched(true);
        }catch (err){
            console.log(err);
        }
    },[]);

    useEffect(() =>{
        if(!isDataFetched){
            fetchGovtData();
        console.log('tt'+isDataFetched);
        }
    },[setIsDataFetched]);

    

    const tableContent = records.map((r) => (
        <tr>
            <td>{r.statename}</td>
            <td>{r.circlename}</td>
            <td>{r.regionname}</td>
            <td>{r.divisionname}</td>
            <td>{r.districtname}</td>
            <td>{r.pincode}</td>
            <td>{r.officetype}</td>
            <td>{r.officename}</td>
            <td>{r.deliverystatus}</td>
            <td>{r.taluk}</td>
            {/* <td>{r.officename}</td>
            <td>{r.officename}</td> */}
        </tr>
    ));

    const tableHeaderDy = tableHeader.map((r) => (
        <tr>
            <th>{r}</th>
        </tr>
    ));

    // const tableContentDy = records.map((r) => (
    //     <tr>
    //         r.{
    //         <td>{r[tableHeader[i]]}</td>
    //         }
    //     </tr>
    // ));

    return (
        <>
        <section className='text-center'>
            Title: {data.title} || Desc: {data.desc}
        </section>
        <Table className='table'>
            <thead>
                <tr>
                <th>statename</th>
                <th>circlename</th>
                <th>regionname</th>
                <th>divisionname</th>
                <th>districtname</th>
                <th>pincode</th>
                <th>officetype</th>
                <th>officename</th>
                <th>deliverystatus</th>
                <th>taluk</th>
                {/* <th>officename</th>
                <th>officename</th> */}
                </tr>
            </thead>
            <tbody>
                {tableContent}
            </tbody>
        </Table>
        {/* <Table className='table'>
            <thead>
                {tableHeaderDy}
            </thead>
            <tbody>
                {tableContentDy}
            </tbody>
        </Table> */}

        </>
    );
};

export default TableData;