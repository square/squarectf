; cat.asm: a bootable floppy which draws a cat.
;
; The cat is made of ~70 triangles and a dozen colors, making everything fit in 512 bytes wasn't easy! The BIOS gives
; us some basic functions, e.g. to clear the screen, draw text or set a pixel. We however need to implement our own
; line/triangle drawing code.
;
; to compile and run:
;   nasm cat.asm -o cat.img
;   qemu-system-i386 -fda cat.img
;
; You can also use dd to put the file on a usb drive and then boot a real machine:
;   dd if=cat.img of=/dev/sdX
;
; My goal was to fit this in a single sector (i.e. 510 bytes of code + data and 2 bytes of signature). Once I hit
; ~510 bytes, I stopped optimizing things. peterferrie did an excellent job golfing the code further, see:
; https://www.reddit.com/r/ReverseEngineering/comments/d5mv1l/reverse_engineering_a_512bytes_bootloader/f0pgv28/
;
; Perhaps with a bit more effort, we could fit something in 280 bytes and tweet it?
;
; If you enjoyed this little piece of x86 assembly, you might also enjoy
; http://www.hugi.scene.org/compo/compoold.htm and https://www.quaxio.com/bootable_cd_retro_game_tweet/
;
; -- Alok

  [bits 16]                  ; Pragma to tell our assembler that we are in 16-bit mode
                             ; (which is the state of x86 when booting from a floppy).
  [org 0x7c00]               ; Pragma, tell the assembler where the code will be loaded.
                             ; See https://wiki.osdev.org/Boot_Sequence to learn more.

  mov sp, 0x7c00             ; stack pointer. Picking 0x7c00 is pretty arbitrary.

  ; a previous version of cat.img wasn't setting ds and didn't work with some machine/virtualization software.
  ; technically, we shouldn't assume cs is 0x0000 and we should set cs, ds, sp, and ip
  push cs
  pop ds

  ; clear screen using int 0x10
  ; we are going to have 320x200 256 colors
  ; see http://stanislavs.org/helppc/int_10.html for BIOS interrupt docs.
  ; http://www.ctyme.com/intr/int-10.htm is another great resource.
  mov ax, 0x0013
  int 0x10

  ; draw our string
  mov ax, 0x1302
  mov bx, 0x0007
  mov bp, msg                ; string offset
  mov cx, 24                 ; string length
  mov dx, ax                 ; re-using ax for the offset shaves 1 byte
  int 0x10

  ; configure our colors
  mov ax, 0x1012
  mov bx, 1                 ; color 0 is black and we want to keep it that way, so start at 1
  mov cx, 12                ; number of entries
  mov dx, palette           ; pointer to colors
  int 0x10

  ; put VRAM in es + a small vertical offset to center the cat
  ; keep in mind that the actual offset (in pixels) is 0x168 * 16 / 320
  push 0xa168
  pop es

  mov si, data               ; si is going to point to our data (i.e. 33 triangles)
.loop:
  call draw_triangle
  add si, 7
  cmp si, data + (33 * 7)   ; loop 33 times
  jne .loop

done:
  jmp done

; Draws a triangle and its mirror.
;
; There are many ways to figure out which points are inside a triangle and which ones are outside. I decided
; to use the triangle proportionality theorem:
; We walk down from A.y to B.y, compute the left most point and right most point, then draw horizontal lines.
; Once we reach B.y, we continue C.y and repeat the same process.
;
; Assuming our triangle is defined by three points, A, B, and C. Assuming that A is above B, B is above C, and AB is to
; the left of AC we have:
;
;                        [A.x,A.y]
;                           ..
;                          .  ..
;                         .     ..
;                        .        ..
;                       .           ..
;                  [B.x,B.y]          ..
;                       ....            ..
;                           ....          ..
;                               ....        ..
;                                   ....      ..
;                                       .... [C.x,C.y]
;
; As h varies from A.y to B.y, the left most point is:
; [A.x + h, A.x + h * (B.x - A.x) / (B.y - A.y)]
;
; As h varies from B.y to C.y, the left most point is:
; [B.x + h, B.x + h * (C.x - B.x) / (C.y - B.y)]
;
; The corresponding right point is always:
; [A.x + h, A.x + h * (C.x - A.x) / (C.y - A.y)]
;
;
; Starting from these formulas, the implementation differs a little. Instead of storing:
; [A.x, A.y, B.x, B.y, C.x, C.y], it's more efficient from a code size point of view to store:
; [A.x, A.y, B.x - A.x, B.y - A.y, C.x - A.x, C.y - A.y].
;
; We must presort our points. To ensure that we can draw any kind of triangle, we draw every pixel twice (mirrored along
; the Y axis) and we either first draw our triangle on the left or the right side. All this is a little mind twisting,
; but it helps keep the code short by saving a whole bunch of bytes!
;
; Note:
; I'll never know if I made the right algorithm choice in terms of size optimization without implementing alternative
; algorithms, which I never did.
;
; There's also a division by zero case I didn't handle (i.e. some right angle triangles can't be drawn), which is fine,
; we can fudge those triangles by 1 pixel.
;
; param si = pointer to data
; destroys ax, bx, cx, dx
draw_triangle:
  ; h goes in cx
  xor cx, cx

.loop1:
  ; compute left coordinate and save in bx:
  ; left = p[0] + h * p[2] / p[3];
  mov al, cl
  mov bl, [si+2]
  imul bl
  mov bl, [si+3]
  idiv bl
  add al, [si]
  movsx bx, al

  ; compute right coordinate gets re-used in .loop2, so we
  ; move it to a subroutine.
  call .compute_right

  ; draw a line from (bx, cx+[si+1]) to (ax, cx+[si+1]) with color [si+6]
  call draw_horz_line

  inc cl
  cmp cl, [si+3]
  jle .loop1

 .loop2:
   ; compute left coordinate and save in bx:
   ; left = (p[0] + p[2]) + (p[3] - h) * (p[2] - p[4]) / (p[5] - p[3])
   mov al, [si+3]
   sub al, cl
   mov bl, [si+2]
   sub bl, [si+4]
   imul bl
   mov bl, [si+5]
   sub bl, [si+3]
   idiv bl
   add al, [si]
   add al, [si+2]
   movsx bx, al

   call .compute_right

   ; draw a line from (bx, cx+[si+1]) to (ax, cx+[si+1]) with color [si+6]
   call draw_horz_line

   inc cl
   cmp cl, [si+5]
   jle .loop2

   ; we are done but we fall-thru instead of doing a ret to shave 1 byte.

   ; param: cl = h, si, si+4, si+5
   ; result in ax
.compute_right:
   ; compute right coordinate and save in ax:
   ; right = p[0] + h * p[4] / p[5];
   mov al, cl
   mov dl, [si+4]
   imul dl
   mov dl, [si+5]
   idiv dl
   add al, [si]
   cbw
   ret

; Draws a horizontal line and its mirror.
; Only works if bx < ax.
;
; param: bx = left
;        ax = right
;        cx = Y
;        [si+6] = color
; destroys bx
draw_horz_line:
.loop:

  ; draw pixel was its own routine but I inlined it to save a call/ret pair.
  ; param: bx = X
  ;        cx = Y - [si+1] (i.e. we have to add [si+1] in here).
  ;        [si+6] = color (hi 4-bits for first pixel, low 4-bits for mirror)
  pusha
  xor dh, dh
  mov dl, [si+1]
  add cx, dx
  mov ax, 320
  mul cx
  add ax, 160
  add ax, bx
  mov di, ax
  mov al, [si+6]
  and al, 0x0f
  stosb                      ; draw first pixel

  sub di, bx
  sub di, bx
  mov al, [si+6]
  shr al, 4
  stosb                      ; draw mirror
  popa

  inc bx
  cmp bx, ax
  jle .loop
  ret

; VGA in mode 13 uses 18-bit colors. So we need to shift our palette by 2.
palette:
  db 0x63>>2, 0x3f>>2, 0x29>>2
  db 0x98>>2, 0x41>>2, 0x12>>2
  db 0xb0>>2, 0x62>>2, 0x25>>2
  db 0xa1>>2, 0x6c>>2, 0x49>>2
  db 0xcb>>2, 0x85>>2, 0x38>>2
  db 0x57>>2, 0x5f>>2, 0x14>>2
  db 0x52>>2, 0x51>>2, 0x18>>2
  db 0x1d>>2, 0x2b>>2, 0x1c>>2
  db 0xb7>>2, 0x3e>>2, 0x43>>2
  db 0x95>>2, 0x77>>2, 0x5d>>2
  db 0xa0>>2, 0x54>>2, 0x20>>2
  db 0xca>>2, 0x7b>>2, 0x30>>2

; Our triangles.
; Remember, the data needs to be sorted and encoded as following:
; [A.x, A.y, B.x - A.x, B.y - A.y, C.x - C.y, color|color]
;
; Note: we are probably wasting a ton of space here. Each triangle requires 7 bytes, but since the triangles are
; touching each other, we should be able to store 7 bytes for the first triangle and then 3-5 bytes for each additional
; triangle. I realized all this way too late ¯\_(ツ)_/¯
data:
  db 7, 104, 249, 1, 250, 10, 0x99     ; nose
  db 241, 77, 254, 7, 5, 11, 0x86      ; eyes
  db 241, 77, 241, 3, 249, 6, 0x68
  db 30, 80, 248, 3, 249, 11, 0x77
  db 17, 84, 249, 4, 6, 7, 0x77
  db 65, 12, 217, 34, 244, 45, 0x41    ; ear
  db 216, 99, 239, 1, 251, 17, 0x22    ; face
  db 57, 79, 239, 20, 0, 21, 0x22
  db 216, 99, 251, 17, 22, 27, 0x41
  db 231, 46, 228, 11, 224, 34, 0xbb
  db 57, 79, 229, 1, 222, 12, 0x55
  db 0, 119, 238, 7, 1, 9, 0xaa
  db 0, 57, 0, 46, 7, 45, 0x55
  db 4, 40, 252, 1, 252, 19, 0x22
  db 252, 40, 250, 11, 4, 19, 0xcc
  db 10, 51, 246, 8, 5, 26, 0x55
  db 0, 59, 241, 18, 246, 29, 0x33
  db 0, 59, 246, 29, 249, 45, 0x33
  db 249, 104, 245, 5, 7, 10, 0x44
  db 18, 109, 238, 5, 0, 17, 0xaa
  db 41, 99, 233, 10, 233, 27, 0x42
  db 233, 91, 239, 8, 5, 18, 0xbb
  db 246, 88, 243, 3, 248, 21, 0x33
  db 11, 88, 252, 16, 8, 22, 0x22
  db 27, 46, 239, 5, 244, 31, 0x22
  db 252, 40, 234, 6, 250, 11, 0x33
  db 24, 38, 236, 2, 2, 8, 0x55
  db 65, 12, 215, 26, 217, 34, 0x22
  db 26, 46, 3, 23, 31, 33, 0x22
  db 230, 46, 253, 23, 11, 31, 0x33
  db 29, 69, 242, 8, 2, 11, 0xcc
  db 227, 69, 228, 10, 255, 11, 0xbb
  db 57, 79, 222, 12, 239, 20, 0x33

; Our string, encoded as following:
; [character, color]
msg:
  db "S", 1, "q", 2, "u", 3, "a", 4,
  db "r", 5, "e", 6, "C", 7, "t", 8,
  db "f", 9, " ", 0, "-", 10, " ", 0
  db "O", 11, "c", 1, "t", 2, " ", 0
  db "1", 3, "0", 4, ",", 5, " ", 0
  db "2", 6, "0", 7, "1", 8, "9", 9

; We are under 510 bytes, great!!!

; For anyone trying to shrink this code further, removing the two colors per triangle handling saves ~10 bytes and
; removing the text (and associated text printing code) saves ~64 bytes. We could use the space to instead do some color
; cycling (see https://miro.medium.com/max/1280/1*F1_GUG4BhZ1cd0miUWD2ZA.gif for a neat example).

  TIMES 510-($-$$) db 0x20   ; Fill the remaining space (if we have any) with any byte
                             ; (I picked 0x20 for no particular reason).

  db 0x55, 0xaa              ; Boot signature at the end of bootloader
