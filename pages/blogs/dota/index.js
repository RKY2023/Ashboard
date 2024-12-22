import React, { useState, useCallback, useEffect } from 'react'

function TrackDotaPlayer() {
  console.log('sss');
  const [playerData, setPlayerData] = useState();
  const [isAPICalled, setIsAPICalled] = useState(true);
  const [playerId, setPlayerId] = useState(56939869);
  const [playerName, setPlayerName] = useState(true);
  const loginHandler = useCallback( async (userData) => {
    let loginUrl, payload;   
    loginUrl = 'https://api.opendota.com/api/players/'+playerId;
    // payload = {
    //     email: userData.email,
    //     password: userData.password,
    // };
    const response = await fetch(loginUrl);
    const data = await response.json();
    console.log('data',data);
    setPlayerData(data);
  },[]);

  useEffect(() => {
    console.log('a');
    if(isAPICalled){
      setIsAPICalled(false);
      loginHandler('aa');
    }
  },[]);
  return (
    <div>TrackDotaPlayer
      {/* main player data */}
      <div>
        {playerName}, 
      </div>
      {/* {playerData} */}
    </div>
  )
}

export default TrackDotaPlayer