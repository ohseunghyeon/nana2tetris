// This file is part of www.nand2tetris.org
// and the book "The Elements of Computing Systems"
// by Nisan and Schocken, MIT Press.
// File name: projects/04/Fill.asm

// Runs an infinite loop that listens to the keyboard input.
// When a key is pressed (any key), the program blackens the screen,
// i.e. writes "black" in every pixel;
// the screen should remain fully black as long as the key is pressed. 
// When no key is pressed, the program clears the screen, i.e. writes
// "white" in every pixel;
// the screen should remain fully clear as long as no key is pressed.

// Put your code here.
  @currentColor
  M=0

(RESET)
  @SCREEN
  D=A
  @screentodraw
  M=D
  @colorToDraw
  M=0

(CHECKKEYBOARD)
  @KBD
  D=M
  @SELECTWHITE
  D;JEQ

(SELECTBLACK)
  @colorToDraw
  M=-1
  @CHECKIFDRAWNEEDED
  0;JMP

(SELECTWHITE)
  @colorToDraw
  M=0

(CHECKIFDRAWNEEDED)
  @colorToDraw
  D=M
  @currentColor
  D=D-M
  @CHECKKEYBOARD
  D;JEQ

// set current color
  @colorToDraw
  D=M
  @currentColor
  M=D

(DRAW)
  @colorToDraw
  D=M

  @screentodraw
  A=M // go to screen
  M=D // draw

  @screentodraw
  M=M+1 // move to next screen
  D=M

  @KBD
  D=A-D // check if the screen reached KBD

  @DRAW
  D;JNE

// finished drawing
  @RESET
  0;JMP

