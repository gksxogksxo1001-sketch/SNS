import zipfile
import xml.etree.ElementTree as ET
import os

def read_xlsx(file_path):
    try:
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            if 'xl/worksheets/sheet1.xml' in zip_ref.namelist():
                with zip_ref.open('xl/worksheets/sheet1.xml') as f:
                    tree = ET.parse(f)
                    root = tree.getroot()
                    ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                    
                    rows = []
                    # Get all rows
                    for row in root.findall('.//ns:row', ns):
                        row_idx = row.get('r')
                        row_data = {} # Map column letter to value
                        for cell in row.findall('.//ns:c', ns):
                            r = cell.get('r') # e.g., A1
                            col_letter = "".join([c for c in r if not c.isdigit()])
                            
                            val = ""
                            # Check for direct value
                            v = cell.find('ns:v', ns)
                            if v is not None:
                                val = v.text
                            
                            # Check for inline string
                            is_node = cell.find('ns:is', ns)
                            if is_node is not None:
                                t = is_node.find('ns:t', ns)
                                if t is not None:
                                    val = t.text
                            
                            row_data[col_letter] = val
                        rows.append(row_data)
                    
                    # Print in a grid way
                    # Find all unique columns
                    all_cols = set()
                    for r in rows:
                        all_cols.update(r.keys())
                    sorted_cols = sorted(list(all_cols), key=lambda x: (len(x), x))
                    
                    for r in rows:
                        line = []
                        for col in sorted_cols:
                            line.append(r.get(col, ""))
                        print("\t".join(line))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    read_xlsx(r"d:\hantae\project\SNSproject\project\20260325_시스템구성도.xlsx")
