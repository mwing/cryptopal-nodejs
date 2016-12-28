const R = require('ramda')
const xor = require('bitwise-xor')
const fs = require('fs')

const hex2base64 = str => new Buffer(str, 'hex').toString('base64')

const xorB = (b1, b2) => xor(b1, b2).toString('hex')
const xorBstr = (b1, b2) => xor(b1, b2).toString('utf8')
const str2b = str => new Buffer(str, 'hex')

const chars = Buffer.from([...Array(256).keys()])
const freq = {'a': 0.0651738,'b': 0.0124248,'c': 0.0217339,'d': 0.0349835,'e': 0.1041442,'f': 0.0197881,'g': 0.0158610,'h': 0.0492888,'i': 0.0558094,'j': 0.0009033,'k': 0.0050529,'l': 0.0331490,'m': 0.0202124,'n': 0.0564513,'o': 0.0596302,   'p': 0.0137645, 'q': 0.0008606, 'r': 0.0497563,'s': 0.0515760,'t': 0.0729357,'u': 0.0225134,'v': 0.0082903,'w': 0.0171272,'x': 0.0013692,'y': 0.0145984, 'z': 0.0007836, ' ': 0.1918182}
const score = c => freq[c] || 0

function printIfCleartext(str, original = '') { 
    const sco = R.sum(R.map(score, str))
    if (sco > 2) { 
        console.log(str, sco, original) 
    } 
}

// 4
function challenge4() {
    fs.readFile('./4.txt', 'utf8', (e, data) => {
        const lines = data.split('\n')
        lines.forEach(line => {
            chars.forEach(x => printIfCleartext(xorBstr(str2b(line), Buffer.allocUnsafe(line.length).fill(x)), line))
        })
    })
}

// 3
function challenge3() {
    const c3b = str2b('1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736')
    const c3res = chars.forEach(x => printIfCleartext(xorBstr(c3b, Buffer.allocUnsafe(68).fill(x))))
}

// 2
function challenge2() {
    const c2 = xorB(str2b('1c0111001f010100061a024b53535009181c'), str2b('686974207468652062756c6c277320657965')).toString()
    console.log(c2)
}

// 1
function challenge1() {
    const c1 = hex2base64('49276d206b696c6c696e6720796f757220627261696e206c696b65206120706f69736f6e6f7573206d757368726f6f6d')
    console.log(c1)
}

// run challenge
challenge4()