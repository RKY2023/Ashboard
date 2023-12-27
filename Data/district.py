import pandas as pd
# df = pd.read_csv(r'D:\Work\\MEGA_DATA_WAREHOUSE\\CSV\\Govt_csv\\lgd_districts.csv')
# # print(df)
# df2 = df[df['state_name_english']=='Jharkhand']

# print(df2.info())

def stateDiv():
    df = pd.read_csv('D:\\Work\\MEGA_DATA_WAREHOUSE\\CSV\\Govt_csv\\Pincode_30052019.csv',encoding='windows-1252')
    # print(df)
    df2 = df[(df['StateName']=='Jharkhand') & (df['OfficeType']=='HO')]
    # df = df2.groupby(['District','StateName','Circle Name'])['District'].count()
    df = df2
    print(df)
    # df.to_csv('D:\\Work\\MEGA_DATA_WAREHOUSE\\CSV\\Govt_csv\\JH_pincode.csv', index=False)
    exit()

def getPostOffice():
    df = pd.read_csv('D:\\Work\\MEGA_DATA_WAREHOUSE\\CSV\\Govt_csv\\Pincode_30052019.csv',encoding='windows-1252')
    # print(df)
    df2 = df[(df['StateName']=='Uttar Pradesh') & (df['OfficeType']=='HO')]
    
    # df = df2.groupby(['District','StateName','Circle Name'])['District'].count()
    df2 = df[(df['StateName']=='Uttar Pradesh') & (df['OfficeType']=='SO') & (df['District']=='GHAZIABAD')]
    df = df2
    print(df)
    # df.to_csv('D:\\Work\\MEGA_DATA_WAREHOUSE\\CSV\\Govt_csv\\JH_pincode.csv', index=False)
    exit()

# stateDiv()
getPostOffice()