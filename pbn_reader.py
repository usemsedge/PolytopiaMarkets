# Polytopia Board Notation
# Includes all details about the Board relevant to markets
# (NOT Polytopia XXXX??? Notation, which includes absolutely everything)

'''
4,5;                      Line 1: Board size HxW (4 rows, 5 cols)
400,311,400,400,300;      Lines 2-H+1: Board layout (row-major order)
302,100,310,300,100;
400,311,400,400,400;      300 = Field, 400/500 = Water/Mountain, 311 = Field with farm, etc.
300,300,300,500,300;
2;                        Line H+2: City count
0,1;                      Line H+3: City capture + border growth order
                          Each city must appear either 1 or 2 times.
                          First appearance = capture, second appearance = border growth
                          Cities are numbered in row-major order, starting at 0,
                          incrementing left to right across each row, then top to bottom.

Lines are split by semicolons. Columns are split by commas. Whitespace makes no difference.


(tile base, resource, improvement)
0 - UNPLACABLE TILE (represents stuff like monuments, lighthouses, etc.renders as black square)
1 - City (implied to be on field always)
2 - Village (this too)
3 - field
4 - water (unplacable tile)
5 - mountain (unplacable tile)

0 - No resource
1 - Crop

0 - NO IMPROVEMENT
1 - farm
2 - windmill
3 - market
'''