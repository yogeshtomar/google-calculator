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

// LarrysAnyTextFileIndexerObj.h : Declaration of the CLarrysAnyTextFileIndexerObj

#pragma once
#include "resource.h"       // main symbols

#include "LarrysAnyTextFileIndexer.h"


// CLarrysAnyTextFileIndexerObj

class ATL_NO_VTABLE CLarrysAnyTextFileIndexerObj : 
	public CComObjectRootEx<CComMultiThreadModel>,
	public CComCoClass<CLarrysAnyTextFileIndexerObj, &CLSID_LarrysAnyTextFileIndexerObj>,
	public ISupportErrorInfo,
	public IDispatchImpl<ILarrysAnyTextFileIndexerObj, &IID_ILarrysAnyTextFileIndexerObj, &LIBID_LarrysAnyTextFileIndexerLib, /*wMajor =*/ 1, /*wMinor =*/ 0>
{
public:
	CLarrysAnyTextFileIndexerObj()
	{
	}

DECLARE_REGISTRY_RESOURCEID(IDR_LARRYSANYTEXTFILEINDEXEROBJ)


BEGIN_COM_MAP(CLarrysAnyTextFileIndexerObj)
	COM_INTERFACE_ENTRY(ILarrysAnyTextFileIndexerObj)
	COM_INTERFACE_ENTRY(IDispatch)
	COM_INTERFACE_ENTRY(ISupportErrorInfo)
END_COM_MAP()

// ISupportsErrorInfo
	STDMETHOD(InterfaceSupportsErrorInfo)(REFIID riid);

	DECLARE_PROTECT_FINAL_CONSTRUCT()

	HRESULT FinalConstruct()
	{
		return S_OK;
	}
	
	void FinalRelease() 
	{
	}

public:

	STDMETHOD(HandleFile)(BSTR RawFullPath, IDispatch* EventFactory);
};

OBJECT_ENTRY_AUTO(__uuidof(LarrysAnyTextFileIndexerObj), CLarrysAnyTextFileIndexerObj)
