const R = require('ramda')
const xor = require('bitwise-xor')
const fs = require('fs')
const assert = require('assert')
const hamming = require('hamming-distance')

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

function xorCharByChar(input, key, enc='hex') {
    if (typeof input === 'string') {
        return input.split('').map((c, i) => xor(c, key.length > 1 ? key.split('')[i % key.length]: key).toString(enc)).join('')
    } else if (typeof input === 'object') {
        return input.map((c, i) => xor(c, key.slice(i % key.length, i % key.length + 1)).toString(enc)).join('')
    }
}

const loadCipherText = file => new Buffer(fs.readFileSync('./6.txt').toString(), 'base64')

const ham = (t1, t2) => hamming(new Buffer(t1), new Buffer(t2))
function determineProbableKeySize(bytes) {
    console.log(bytes.slice(0,10))
    const keySizesToTest = [...Array(40).keys()].map(x => x+1)
    const hammings = {}
    keySizesToTest.forEach(size => {
        const first = bytes.slice(0, size)
        const second = bytes.slice(size, size * 2)
        const third = bytes.slice(size * 2, size * 3)
        const fourth = bytes.slice(size * 3, size * 4)
        if (R.uniq([first, second, third, fourth].map(x => x.length)).length !== 1) return
        const normalized = ham(first, second) / size
        const normalized2 = ham(first, third) / size
        const normalized3 = ham(first, fourth) / size
        const normalized4 = ham(second, third) / size
        const normalized5 = ham(third, fourth) / size
        // console.log(normalized, normalized2, normalized3)
        hammings[size] = (normalized + normalized2 + normalized3 + normalized4 + normalized5) / 5
        // hammings[size] = normalized
    })
    return R.take(4, R.sortBy(pair => pair[1], R.toPairs(hammings))).map(R.prop(0)).map(x => Number(x)) // take 4 for now
}

const xorWithSingleByte = (buffer, charCode) => {
    // console.log(`xor buffer with charCode ${charCode}, buffer length ${buffer.length}`)
    const result = []
    const keyB = new Buffer(String.fromCharCode(charCode))
    for (let i = 0; i < buffer.length; i++) result.push(buffer[i] ^ keyB[0])
    return new Buffer(result).toString('ascii')
}

function solveKeyForSingleByteXor(transposed) {
    const pickBest = (prevBest, char) => {
        const xorred = xorWithSingleByte(transposed, char)
        const scored = R.sum(R.map(score, xorred))
        if (scored > prevBest.score) {
            // console.log(`${char} was better than previous best with score ${scored}, res ${xorred}`)
            return {char, score: scored}
        } 
        return prevBest
    }
    return R.reduce(pickBest, {'char': '', score: 0}, chars)
}

function solveForKeySize(cipherB, keySize) {
    // Now that you probably know the KEYSIZE: break the ciphertext into blocks of KEYSIZE length.
    const chunks = R.splitEvery(keySize, cipherB)
    // Now transpose the blocks: make a block that is the first byte of every block, and a block that is the second byte of every block, and so on.
    const transposed = R.times(i => {
        return Buffer.concat(chunks.map(chunk => chunk.slice(i, i+1)))
    }, keySize)
    // Solve each block as if it was single-character XOR. You already have code to do this.
    console.log(`splitted and transposed into ${transposed.length} chunks`)
    const solvedKeys = transposed.map(tr => solveKeyForSingleByteXor(tr))
    // For each block, the single-byte XOR key that produces the best looking histogram is the repeating-key XOR key byte for that block. Put them together and you have the key.        
    return solvedKeys.map(x => x.char)
}

// 6
function challenge6() {
    const test = 'this is a test'
    const wokka = 'wokka wokka!!!'
    assert.equal(hamming(new Buffer(test), new Buffer(wokka)), 37)

    // Load encrypted text and make a byte buffer out of it
    const cipher = loadCipherText('./6.txt')

    // Determine probable key sizes
    const probableKeySizes = determineProbableKeySize(cipher)
    console.log('probable key sizes are:', probableKeySizes.join(', '))

    // Find out possible keys based on the most likely key sizes
    const suspectKeys = probableKeySizes.map(size => solveForKeySize(cipher, size))
    console.log('keys that might work:', suspectKeys.map(r => r.map(c => String.fromCharCode(c)).join('')))
    
    // Try decrypting with the possible keys & use statistics to find out the most likely match
    const keys = suspectKeys.map(key => key.map(c => String.fromCharCode(c)).join(''))
    const possibleDecryptions = keys.map(key => xorBstr(cipher, key.repeat(cipher.length/key.length)))
    const best = R.reduce((candidate, text) => {
        const scored = R.sum(R.map(score, text))
        return scored > candidate.score ? {score: scored, text} : candidate
    }, {score: 0, decrypted: ''}, possibleDecryptions)
    console.log(best.text)
}

// 5
function challenge5() {
    const cleartext = `Burning 'em, if you ain't quick and nimble\nI go crazy when I hear a cymbal`
    const key = 'ICE'
    const cipher = xorCharByChar(cleartext, key)
    const expected = '0b3637272a2b2e63622c2e69692a23693a2a3c6324202d623d63343c2a26226324272765272a282b2f20430a652e2c652a3124333a653e2b2027630c692b20283165286326302e27282f'
    console.log(cipher)
    assert.equal(cipher, expected)
}

// 4
function challenge4() {
    fs.readFile('./4.txt', 'utf8', (e, data) => {
        const lines = data.split('\n')
        lines.forEach(line => {
            chars.forEach(x => printIfCleartext(xorBstr(str2b(line), Buffer.allocUnsafe(line.length).fill(x))))
        })
    })
}

// 3 Single-byte XOR cipher
function challenge3() {
    const c3b = str2b('1b37373331363f78151b7f2b783431333d78397828372d363c78373e783a393b3736')
    const c3res = chars.forEach(x => printIfCleartext(xorBstr(c3b, Buffer.allocUnsafe(68).fill(x)), `>${x}<`))
    assert.equal(88, solveKeyForSingleByteXor(c3b).char) // 88 is keyCode for 'X'
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
// console.log(determineProbableKeySize(new Buffer('0b3637272a2b2e63622c2e69692a23693a2a3c6324202d623d63343c2a26226324272765272a282b2f20430a652e2c652a3124333a653e2b2027630c692b20283165286326302e27282f', 'base64')))
// solveForKeySize(new Buffer('0b3637272a2b2e63622c2e69692a23693a2a3c6324202d623d63343c2a26226324272765272a282b2f20430a652e2c652a3124333a653e2b2027630c692b20283165286326302e27282f', 'base64'), 3)
challenge6()