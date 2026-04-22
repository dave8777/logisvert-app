'use client'

import { useState } from "react"

export default function Home() {
  const [ahri, setAhri] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkRebate = async () => {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch(`/api/logisvert-rebate?ahri=${ahri}`)
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setResult({ error: "Failed to fetch" })
    }

    setLoading(false)
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>LogisVert Rebate Tool</h1>

      <input
        placeholder="Enter AHRI"
        value={ahri}
        onChange={(e) => setAhri(e.target.value)}
        style={{ padding: 10, width: "100%", marginBottom: 10 }}
      />

      <button onClick={checkRebate} style={{ padding: 10 }}>
        {loading ? "Checking..." : "Check Rebate"}
      </button>

      {result && (
        <pre style={{ marginTop: 20 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
