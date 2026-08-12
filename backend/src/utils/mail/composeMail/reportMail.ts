export const reportHTMLTemplate = (data: string[]) => `<html>
      <h1>LinkFixer Report</h1>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    </html>`
