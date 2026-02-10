  What Tony has NOW (on his live board)                                                                                              
                                                                                                                                     
  - index.php - The standard forum index (hierarchical list of forums)                                                               
  - No portal - He doesn't have a portal page at all currently                                                                       
  - Default theme - Probably prosilver or a variation                                                                                
  - ACP access - Tony can create/edit forums, set descriptions, order, permissions                                                   
                                                                                                                                     
  Tony CANNOT currently configure "which forums appear on a portal" because there IS no portal yet.                                  
                                                                                                                                     
  What the deployment looks like                                                                                                     
                                                                                                                                     
  You'd be adding 3 things to Tony's server:                                                                                         
                                                                                                                                                                                                                                                          
  ```
Tony's Board
├── portal.php ← NEW FILE
├── styles/prosilver/template/
│   └── portal.html ← NEW FILE
└── images/portal/ ← NEW FOLDER
    ├── waronfreedom.jpg
    └── banner1.jpg, banner2.jpg
```
                                                                                                  
                                                                                                                                     
  The configuration conversation                                                                                                     
                                                                                                                                     
  Before copying files:                                                                                                              
                                                                                                                                     
  1. You ask Tony: "What are your forum names?" (He tells you: "9/11 Discussion", "Covid Analysis", "General Chat", etc.)            
  2. You ask: "Which forums should appear in Latest News?" (He says: "9/11 Discussion and Covid Analysis")                           
  3. You ask: "Which in Latest Events?" (He says: "Events & Meetups")                                                                
                                                                                                                                     
  Then YOU edit portal.php on your local copy:                                                                                       
                                                                                                                                     
  // Line 59 - change from your test forums:                                                                                         
  $news_forums = ['Breaking News', 'Analysis & Context', 'Events & Announcements'];                                                  
                                                                                                                                     
  // To Tony's actual forums:                                                                                                        
  $news_forums = ['9/11 Discussion', 'Covid Analysis'];                                                                              
                                                                                                                                     
  Then copy the files to his server via FTP/SFTP.                                                                                    
                                                                                                                                     
  What Tony gets                                                                                                                     
                                                                                                                                     
  - New URL: tony-site.com/portal.php (the retro portal page)                                                                        
  - Existing URL still works: tony-site.com/index.php (unchanged forum index)                                                        
  - No ACP changes needed - It just works once files are copied                                                                      
                                                                                                                                     
  Tony can still manage forums in ACP as normal. If he wants to change which forums appear on the portal later, you'd need to edit   
  portal.php again (unless we build an ACP interface for it, which is more complex).  

