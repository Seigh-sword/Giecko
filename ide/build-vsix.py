import json
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
EXT = os.path.join(ROOT, "giecko-ide-ext")
OUT = os.path.join(ROOT, "dist")


def manifest(pkg):
    return f"""<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="{pkg["name"]}" Version="{pkg["version"]}" Publisher="{pkg["publisher"]}"/>
    <DisplayName>{pkg["displayName"]}</DisplayName>
    <Description xml:space="preserve">{pkg["description"]}</Description>
    <License>ISC</License>
    <Tags>giecko,terminal,remote</Tags>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="{pkg["engines"]["vscode"]}"/>
      <Property Id="Microsoft.VisualStudio.Services.Links.License" Value="https://opensource.org/license/isc-license-txt/"/>
    </Properties>
    <Categories>Other</Categories>
  </Metadata>
  <Installation InstalledBy="vsix" AllUsers="true">
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="extension/icon.png" Addressable="true"/>
  </Assets>
</PackageManifest>
"""


def main():
    pkg = json.load(open(os.path.join(EXT, "package.json"), encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    vsix = os.path.join(OUT, "giecko-ide-%s.vsix" % pkg["version"])
    content_types = """<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="json" ContentType="application/json"/>
  <Default Extension="js" ContentType="text/javascript"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="xml" ContentType="text/xml"/>
  <Default Extension="md" ContentType="text/markdown"/>
</Types>
"""
    with zipfile.ZipFile(vsix, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("extension.vsixmanifest", manifest(pkg))
        for name in ["package.json", "extension.js", "icon.png"]:
            z.write(os.path.join(EXT, name), "extension/" + name)
    print("wrote " + vsix + " (%d bytes)" % os.path.getsize(vsix))
    return 0


if __name__ == "__main__":
    sys.exit(main())
