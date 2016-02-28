pieces = ((content? placeholder)* content?)

content = c:[^{}]* { return { content: c.join('') }; }

placeholder = phs ws? v:(variable) ws? phe { return { placeholder: v }; }

variable = c:vc+ { return c.join(''); }

vc "valid character" = [a-zA-Z0-9_.]

phs "placeholder start" = "{{"

phe "placeholder end" = "}}"

ws "whitespace" = [ \t\r\n]
