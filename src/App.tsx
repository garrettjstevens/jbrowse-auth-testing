import React, { useState } from 'react';
import { BigWig } from '@gmod/bbi'
import { RemoteFile } from 'generic-filehandle'
import GoogleLogin from 'react-google-login'
import './App.css';

function App() {
  const [bigWigUrl, setBigWigUrl] = useState('')
  const [bigWigHeader, setBigWigHeader] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [tokenInfo, setTokenInfo] = useState({
    token_type: '',
    access_token: '',
  })
  const [files, setFiles] = useState([])

  function onBigWigUrlChange(event: React.ChangeEvent<HTMLInputElement>) {
    setErrorMessage('')
    setBigWigUrl(event.target.value)
  }

  function getIdFromUrl(url: string) { return url.match(/[-\w]{25,}/); }

  async function onFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    let bigWigUrlValidated: string
    try {
      const url = new URL(bigWigUrl)
      bigWigUrlValidated = url.href
    } catch (error) {
      console.error(error)
      setErrorMessage('invalid URL')
      return
    }

    if(bigWigUrlValidated.includes('google.com')){
      if(!loggedIn){
        setErrorMessage('Not Authorized')
        return
      }
      const urlId = getIdFromUrl(bigWigUrlValidated)
      console.log(urlId ? urlId[0] : '')
      try{
        const response = await fetch(`https://www.googleapis.com/drive/v2/files/${urlId}`, {
          credentials: 'include',
          headers: {
            'Authorization': `${tokenInfo.token_type} ${tokenInfo.access_token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        })
        const json = await response.json()
        setBigWigHeader(json.title)
        console.log('file', json)
      }
      catch(error){
        console.error(error)
        setErrorMessage('could not fetch file')
        return
      }
    }
    else{
      const filehandle = new RemoteFile(bigWigUrlValidated)
      const file = new BigWig({ filehandle })
      const header = await file.getHeader()
      setBigWigHeader(JSON.stringify(header, null, 2))
    }
  }

  async function fetchAllFiles() {
    if(!loggedIn){ 
      setErrorMessage('Not Authorized')
      return
    }
    let fetchResponse
    try {
      fetchResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        credentials: 'include',
        headers: {
          'Authorization': `${tokenInfo.token_type} ${tokenInfo.access_token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      })
    }
    catch(error){
      console.log(error)
    }

    const json = await fetchResponse?.json()
    console.log(json)
    setFiles(json)
  }


  const responseGoogle = async (response: any) => {
    console.log(response);
    setLoggedIn(true)
    const tokenInfo = response.tokenObj
    console.log(tokenInfo.access_token)
    setTokenInfo(tokenInfo)
  }

  return (
    <div className="App">
    <form onSubmit={onFormSubmit}>
      <label>
        BigWig URL:
        <input
          size={75}
          type="text"
          name="name"
          value={bigWigUrl}
          onChange={onBigWigUrlChange}
          required
        />
      </label>
      <br />
      <input type="submit" value="Get header" />
    </form>
    <button onClick={fetchAllFiles}> Fetch all files</button>
    <div style={{color: 'red'}}>{errorMessage}</div>
    <textarea readOnly value={bigWigHeader} rows={70} cols={50}/>
    <GoogleLogin 
      clientId='20156747540-bes2tq75790efrskmb5pa3hupujgenb2.apps.googleusercontent.com'
      buttonText='Login'
      scope='https://www.googleapis.com/auth/drive.metadata'
      // scope='https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly	https://www.googleapis.com/auth/drive.readonly'
      cookiePolicy={'single_host_origin'}
      onSuccess={responseGoogle}
    />
    </div>
  );
}

export default App;
