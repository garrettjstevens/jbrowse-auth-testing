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
  const [files, setFiles] = useState<any[]>([])

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
        const response = await fetchGoogleDriveFile(urlId)
        if(response){
          const test = await response.json()
          console.log(test)
          const filehandle = new RemoteFile(test.downloadUrl, {
            overrides: {
              credentials: 'include',
              headers: {
                'Authorization': `${tokenInfo.token_type} ${tokenInfo.access_token}`,
                'Content-Type': 'application/octet-stream'
              }
            }
          })
          const file = new BigWig({ filehandle })
          const header = await file.getHeader()
          console.log(test)
          setBigWigHeader(JSON.stringify(header, null, 2))
        }
    }
    else{
      const filehandle = new RemoteFile(bigWigUrlValidated)
      const file = new BigWig({ filehandle })
      const header = await file.getHeader()
      console.log(filehandle, file, header)
      setBigWigHeader(JSON.stringify(header, null, 2))
    }
  }

  async function fetchGoogleDriveFile(urlId: any){
    try{
      const response = await fetch(`https://www.googleapis.com/drive/v2/files/${urlId}`, {
        headers: {
          'Authorization': `${tokenInfo.token_type} ${tokenInfo.access_token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      })

      return response
    }
    catch(error){
      console.error(error)
      setErrorMessage('could not fetch file')
      return
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
    setFiles(json.files)
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
          autoComplete="off"
        />
      </label>
      <br />
      <input type="submit" value="Get header" />
    </form>
    <button onClick={fetchAllFiles}> Fetch all files</button>
    {files.length > 0 && <div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Id</th>
          </tr>
        </thead>
        <tbody>
          {
            files.map((file: any) => {
              return (
                <tr key={file.name} >
                  <td onClick={async() =>{ 
                    const response = await fetchGoogleDriveFile(file.id)
                    console.log('here')
                    if(response){
                      const test = await response.json()
                      console.log(test)
                      const filehandle = new RemoteFile(test.downloadUrl, {
                        overrides: {
                          headers: {
                            'Authorization': `${tokenInfo.token_type} ${tokenInfo.access_token}`,
                            'Content-Type': 'application/octet-stream'
                          }
                        }
                      })
                      const file = new BigWig({ filehandle })
                      const header = await file.getHeader()
                      console.log(test)
                      setBigWigHeader(JSON.stringify(header, null, 2))
                    }
                  }}>{file.name}</td>
                  <td>{file.id}</td>
                </tr>
              )
            })
          }
        </tbody>
      </table>
    </div>}
    <div style={{color: 'red'}}>{errorMessage}</div>
    <textarea readOnly value={bigWigHeader} rows={70} cols={50}/>
    <GoogleLogin 
      clientId='20156747540-bes2tq75790efrskmb5pa3hupujgenb2.apps.googleusercontent.com'
      buttonText='Login'
      scope='https://www.googleapis.com/auth/drive'
      // scope='https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly	https://www.googleapis.com/auth/drive.readonly'
      cookiePolicy={'single_host_origin'}
      onSuccess={responseGoogle}
    />
    </div>
  );
}

export default App;
