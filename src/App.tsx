import React, { useEffect, useState } from 'react';
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
  const [dbTokenInfo, setDbTokenInfo] = useState({
    token_type: '',
    access_token: '',
  })
  const [dropboxCode, setDropboxCode] = useState('')
  
  // parse location, if there is a code param then send info to parent and close the window
  // and do a window.opener.postMessage, and probably add an event listener to receieve the postMessage
  const [files, setFiles] = useState<any[]>([])

  if(window && window.location.href.includes('code'))
  {
    console.log('inside')
    const queryString = window.location.search
    const urlParams = new URLSearchParams(queryString)
    const code = urlParams.get('code')
    const parent = window.opener
    if(code && parent){
      parent.postMessage({code: code}, 'http://localhost:3000')
      setLoggedIn(true)
      window.close()
    }
  }

  window.addEventListener("message", event => {
    if(event.data.code){
      setDropboxCode(event.data.code)
    }
  })

  useEffect(() => {
    async function getDropboxToken(){
      const data = {
        code: dropboxCode,
        grant_type: 'authorization_code',
        client_id: 'wyngfdvw0ntnj5b',
        client_secret: 'o1qarh66eu1m48y',
        redirect_uri:'http://localhost:3000'
      }

      const params = Object.entries(data)
      .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
      .join('&')

      if(dropboxCode){
        const response = await fetch('https://api.dropbox.com/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        })
        const token = await response.json()
        console.log(token)
        setDbTokenInfo({
          token_type: token.token_type,
          access_token: token.access_token,
        })
      }
    }
    getDropboxToken()
  }, [dropboxCode])
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
          const filehandle = new RemoteFile(test.downloadUrl, {
            overrides: {
              // credentials: 'include',
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
    else if(bigWigUrlValidated.includes('dropbox.com')){
      // if(!loggedIn){
      //   setErrorMessage('Not authorized')
      //   return
      // }
      const response = await fetch('https://api.dropboxapi.com/2/sharing/get_shared_link_metadata',{
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dbTokenInfo.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: bigWigUrlValidated
        }),
      })
      const json = await response.json()
      console.log(json)
      if(json.id){
        // const data = {
        //   id: json.id.replace('id:', '')
        // }
        // const fileResponse = await fetch('https://api.dropboxapi.com/2/file_requests/get', {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${dbTokenInfo.access_token}`,
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify(data)
        // })
        // const data = {
        //   path: json.id
        // }
        // const fileResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${dbTokenInfo.access_token}`,
        //     'Content-Type': 'application/octet-stream',
        //     'Dropbox-API-Arg': JSON.stringify(data),
        //   },
        // })
        const filehandle = new RemoteFile(bigWigUrlValidated, {
          overrides: {
            credentials: 'include',
            headers: {
              'Authorization': `${dbTokenInfo.token_type} ${dbTokenInfo.access_token}`,
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
    setFiles(json.files)
  }


  const responseGoogle = async (response: any) => {
    setLoggedIn(true)
    const tokenInfo = response.tokenObj
    setTokenInfo(tokenInfo)
  }

  const dropboxOauth = async() => {
    const data = {
      client_id: 'wyngfdvw0ntnj5b',
      redirect_uri: 'http://localhost:3000',
      response_type: 'code'
    }

    const params = Object.entries(data)
    .map(([key, val]) => `${key}=${encodeURIComponent(val)}`)
    .join('&')

    createOauthWindow(`https://www.dropbox.com/oauth2/authorize?${params}`)
  }

  function createOauthWindow(url: string, name = 'Authorization', width = 500, height = 600, left = 0, top = 0) {
    const options =   `width=${width},height=${height},left=${left},top=${top}`;
    return window.open(url, name, options);
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
                    if(response){
                      const test = await response.json()
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
    <button onClick={dropboxOauth}>Dropbox Login</button>
    </div>
  );
}

export default App;
