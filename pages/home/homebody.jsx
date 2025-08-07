import dynamic from 'next/dynamic';
const Table = dynamic(() => import('react-bootstrap').then(mod => mod.Table), { ssr: false });

const HomeBody = () => {
    return (
        <>

        </>
    );
};
export default HomeBody;