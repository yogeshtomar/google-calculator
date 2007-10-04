/*
Copyright (C) 2007 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

#include <string>
#include <vector>
#include <map>
#include <ctime>
#include <windows.h>
#include <atlstr.h>
#include <atlsafe.h>
#include "GoogleDesktopSearchAPI.h"

using namespace std;

class LarGDSPlugin {

private:
	struct ConversationStruct {
		time_t LastMessageTime;
		ULONG ConversationID;
	};
 
	CLSID ObjClassID;
	map <string, ConversationStruct> Conversations;

public:
	LarGDSPlugin(CLSID ClassID);
	bool RegisterPlugin(string Title, string Description, string IconPath);
	bool RegisterPluginWithExtensions(string Title, string Description, string IconPath, vector<string> &Extensions);
	bool UnregisterPlugin();
	bool SendIMEvent(string Content, string UserName, string BuddyName, string Title, unsigned long ConversationID);
	bool SendIMEvent(string Content, string UserName, string BuddyName, string Title, unsigned long ConversationID, SYSTEMTIME MessageTime, string Format);
	bool SendTextFileEvent(string Content, string Path, SYSTEMTIME LastModified);
	unsigned long GetConversationID(string Identifier);
	unsigned long GetConversationID(string Identifier, int Timeout);
};