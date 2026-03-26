import zipfile
import xml.etree.ElementTree as ET
import os

def extract_all_text(file_path):
    try:
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            return

        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            # Check for shared strings
            shared_strings = []
            if 'xl/sharedStrings.xml' in zip_ref.namelist():
                with zip_ref.open('xl/sharedStrings.xml') as f:
                    tree = ET.parse(f)
                    root = tree.getroot()
                    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                    for t in root.findall('.//ns:t', ns):
                        shared_strings.append(t.text if t.text else "")
            
            # Read sheet1
            if 'xl/worksheets/sheet1.xml' in zip_ref.namelist():
                with zip_ref.open('xl/worksheets/sheet1.xml') as f:
                    tree = ET.parse(f)
                    root = tree.getroot()
                    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                    
                    for cell in root.findall('.//ns:c', ns):
                        t = cell.get('t')
                        v = cell.find('ns:v', ns)
                        if t == 's' and v is not None:
                            try:
                                idx = int(v.text)
                                if idx < len(shared_strings):
                                    print(shared_strings[idx])
                            except:
                                pass
                        elif v is not None and v.text:
                            print(v.text)
                        
                        is_node = cell.find('ns:is', ns)
                        if is_node is not None:
                            t_node = is_node.find('ns:t', ns)
                            if t_node is not None and t_node.text:
                                print(t_node.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_all_text(r"d:\hantae\project\SNSproject\project\20260325_시스템구성도.xlsx")
