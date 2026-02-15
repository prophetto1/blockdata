# PowerShell table generator for 0209 items
\ = 'dev-todos/action-plans/reconciliation-drafts/2026-02-14-verified-reconciliation.md' 
\ = Get-Content tmp_0209_lines.txt -Encoding Unicode
\ = '(\\d+):- (0209-[ADP]\\d+): .* \*\*(.*?)\*\* — (.*)' 
\ = @{ 'DONE'='implemented'; 'PARTIAL'='partial'; 'NOT STARTED'='open'; 'SUPERSEDED'='superseded'; 'N/A'='open' }
\ = @{ '0209-A38'='partial'; '0209-A46'='partial' }
\ = @{ implemented=0; partial=0; open=0; superseded=0 }
\ = @()
foreach ( in ) {
     = .Trim()
    if (-not  -or .StartsWith('28:##')) { continue }
    if ( -match ) {
         = [1]
         = [2]
         = [3]
         = ([4] -replace '\|',' / ')
         = []
        if (-not ) {  = 'implemented' }
        if (.ContainsKey()) {  = [] }
         =  + ':' + 
         += [PSCustomObject]@{ Item=; Verdict=; Evidence=; Notes= }
        []++
    }
}
Write-Output '| item_id | verdict | evidence | notes |' 
Write-Output '|---|---|---|---|' 
foreach ( in ) {
