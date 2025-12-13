import dynamic from 'next/dynamic';

// Dynamically import the map only on the client
const LeafletMap = dynamic(() => import('../../components/LeafletMap'), { ssr: false });

export default function Map() {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      {/* <LeafletMap /> */}
    </div>
  );
}
