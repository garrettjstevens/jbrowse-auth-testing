import React, { useState } from 'react';
import { BigWig } from '@gmod/bbi'
import { RemoteFile } from 'generic-filehandle'
import './App.css';

function App() {
  const [bigWigUrl, setBigWigUrl] = useState('')
  const [bigWigHeader, setBigWigHeader] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  function onBigWigUrlChange(event: React.ChangeEvent<HTMLInputElement>) {
    setErrorMessage('')
    setBigWigUrl(event.target.value)
  }

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
    const filehandle = new RemoteFile(bigWigUrlValidated)
    const file = new BigWig({ filehandle })
    const header = await file.getHeader()
    setBigWigHeader(JSON.stringify(header, null, 2))
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
    <div style={{color: 'red'}}>{errorMessage}</div>
    <textarea readOnly value={bigWigHeader} rows={70} cols={50}/>
    </div>
  );
}

export default App;
