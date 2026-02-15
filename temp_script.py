# -*- coding: utf-8 -*-
import re
from collections import Counter
verdicts={'DONE':'implemented','PARTIAL':'partial','NOT STARTED':'open','SUPERSEDED':'superseded','N/A':'open'}
special={'0209-A38':'partial','0209-A46':'partial'}
counts=Counter()
pattern=re.compile(r'(\d+):- (0209-[ADP]\d+): .* \*\*(.*?)\*\* — (.*)')
with open('tmp_0209_lines.txt', encoding='utf-16-le', errors='ignore') as fp:
    for line in fp:
        line=line.strip()
        if not line or line.startswith('28:##'):
            continue
        m=pattern.match(line)
        if not m:
            continue
        _, item, status, note = m.groups()
        verdict=special.get(item, verdicts.get(status,'open'))
        counts[verdict]+=1
print(counts)
