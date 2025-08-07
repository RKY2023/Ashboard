import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic';
const Table = dynamic(() => import('react-bootstrap').then(mod => mod.Table), { ssr: false });
import DefaultDashboard from './default';

function Dashboard() {
  useEffect(() => { 
  },[]);

  return (
    <>
    <DefaultDashboard/>
    </>
  )
}

export default Dashboard