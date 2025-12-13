import data from "../data//ListData.json";

interface ListItem {
  id: number;
  prefix: string;
  meaning: string;
  language: string;
  words: string;
}

interface ListProps {
  input: string;
}

function List({ input }: ListProps): JSX.Element {
    //create a new array by filtering the original array
    const filteredData = data.filter((el: ListItem) => {
        //if no input the return the original
        if (input === '') {
            return el;
        }
        //return the item which contains the user input
        else {
            return el.prefix.toLowerCase().includes(input);
        }
    });
    return (
        <ul>
            {filteredData.map((item: ListItem) => (
                <li key={item.id}>
                    <div className='w-full flex-row'>
                        <div className='title '>
                            <div className='title_icon'>
                                UIcon
                            </div>
                            <div className='title_name'>
                                Ironwood Treant {item.prefix}
                            </div>
                        </div>
                        <div className='content'>
                            <div>{item.meaning}</div>
                            <div>{item.language}</div>
                            <div>{item.words}</div>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default List;