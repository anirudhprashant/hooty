Vendored from github.com/sanchaya/ascii2unicode (GPLv3).

Local change: three index guards. The original indexes output[-1] before checking the word has any output,
which raises IndexError on any page whose text starts with a vattakshara or broken case. Guarded with
`output and ...` in process_word. No mapping was altered.
