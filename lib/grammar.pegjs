pieces = (directive? (content? placeholder)* content?)

directive = ("$" d:[a-zA-Z0-9]* ":") { return { type: 'directive', value: d.join('') }; }

content = c:[^{}]* { return { type: 'content', value: c.join('') }; }

placeholder = phs ws* v:(variable) ws* phe { return { type: 'placeholder', value: v }; }

variable = c:vc+ { return c.join(''); }

vc "valid character" = [a-zA-Z0-9_.]

phs "placeholder start" = "{{"

phe "placeholder end" = "}}"

ws "whitespace" = [ \t\r\n]
