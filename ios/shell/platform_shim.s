.section __TEXT,__text
.globl ___isPlatformVersionAtLeast
___isPlatformVersionAtLeast:
    // (uint32_t target, uint32_t major, uint32_t minor, uint32_t patch)
    // semantics: caller passes runtime version pieces; treat (major,minor,patch)
    // as a packed 24-bit version and compare against target.
    lsr w8, w1, #0        // major
    mov w9, #0x10000
    mul w8, w8, w9        // major << 16
    lsr w10, w2, #0
    mov w9, #0x100
    mul w10, w10, w9      // minor << 8
    add w8, w8, w10
    add w8, w8, w3        // + patch
    cmp w8, w0
    cset w0, ge
    ret
