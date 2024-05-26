import React from 'react';
import TableData from './TableData';

const apiKey = '?api-key=579b464db66ec23bdd0000011f7181905bf546384569a2eee2ff0098';
const baseurls = 'https://api.data.gov.in';
const urls = {
    eightCoreIndustry: '/resource/7b054340-590c-4135-8797-71a160d0d240',
    pinCodeDir: '/resource/6176ee09-3d56-4a3b-8115-21841576b2f6',
};

const GovtDirectory = (props) => {
    const url = baseurls + urls.pinCodeDir + apiKey +'&format=json';
    return (
        <>
            <TableData url={url}/>
        </>
    );
};

export default GovtDirectory;