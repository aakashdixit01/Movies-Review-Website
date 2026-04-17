const mongoose = require('mongoose');
const Movie = require('../models/movie');
const { createPosterDataUri } = require('../utils/localMedia');
const { createDefaultReviews } = require('../utils/reviews');
const animationCatalog = require('./animationCatalog.json');
const titleMetadata = require('./titleMetadata');
const indiaCinemaCatalog = require('./indiaCinemaCatalog');
const moreMoviesCatalog = require('./moreMoviesCatalog');

mongoose.connect('mongodb://127.0.0.1:27017/cineverse')
    .then(() => console.log('Database Connected'))
    .catch(err => console.log('Database Connection Error:', err));

const themeByLibrary = {
    Hollywood: '111827',
    Bollywood: '7c2d12',
    Korean: '831843',
    International: '0f766e',
    Indian: '1d4ed8'
};

const buildDescription = ({ title, type, genre, director, cast, library }) => {
    const format = type === 'TV Series' ? 'series' : 'film';
    const safeDirector = director || 'an uncredited director';
    const leadCast = Array.isArray(cast) && cast.length
        ? `featuring ${cast.slice(0, 3).join(', ')}`
        : 'with a cast lineup to be announced';
    return `${title} is a ${genre.toLowerCase()} ${format} from ${library} directed by ${safeDirector}, ${leadCast}.`;
};

const getTitleMetadata = (title, year) => titleMetadata[title] || titleMetadata[`${title} ${year}`] || null;

const createEntry = ({ title, year, type, library, genre, director, cast, imdbRating, color, poster, description }) => {
    const metadata = getTitleMetadata(title, year);
    const fallbackPoster = createPosterDataUri({ title, year, type, library });
    const resolvedPoster = (metadata && metadata.poster) || poster || fallbackPoster;
    const resolvedDirector = (metadata && metadata.director) || director;
    const resolvedCast = (metadata && Array.isArray(metadata.cast) && metadata.cast.length) ? metadata.cast : cast;

    return {
        title,
        year,
        type,
        library,
        genre,
        director: resolvedDirector,
        cast: resolvedCast,
        poster: resolvedPoster,
        image: fallbackPoster,
        description: description || buildDescription({
            title,
            type,
            genre,
            director: resolvedDirector,
            cast: resolvedCast,
            library
        }),
        imdbRating,
        reviews: createDefaultReviews({
            title,
            year,
            type,
            library,
            genre,
            director: resolvedDirector,
            cast: resolvedCast,
            imdbRating
        })
    };
};

const parseEntry = (line, type) => {
    const [title, year, library, genre, director, cast, imdbRating, color] = line.split('|');
    return createEntry({
        title,
        year: Number(year),
        type,
        library,
        genre,
        director,
        cast: cast.split(';'),
        imdbRating: Number(imdbRating),
        color
    });
};

const movieCatalog = [
    'The Shawshank Redemption|1994|Hollywood|Drama|Frank Darabont|Tim Robbins;Morgan Freeman;Bob Gunton|9.3',
    'The Dark Knight|2008|Hollywood|Action, Crime|Christopher Nolan|Christian Bale;Heath Ledger;Aaron Eckhart|9.0',
    'Inception|2010|Hollywood|Sci-Fi, Thriller|Christopher Nolan|Leonardo DiCaprio;Joseph Gordon-Levitt;Elliot Page|8.8',
    'Interstellar|2014|Hollywood|Sci-Fi, Drama|Christopher Nolan|Matthew McConaughey;Anne Hathaway;Jessica Chastain|8.7',
    'Dune|2021|Hollywood|Adventure, Sci-Fi|Denis Villeneuve|Timothee Chalamet;Zendaya;Rebecca Ferguson|8.0',
    'Oppenheimer|2023|Hollywood|Drama, History|Christopher Nolan|Cillian Murphy;Emily Blunt;Robert Downey Jr.|8.3',
    'Top Gun: Maverick|2022|Hollywood|Action, Drama|Joseph Kosinski|Tom Cruise;Miles Teller;Jennifer Connelly|8.2',
    'Spider-Man: No Way Home|2021|Hollywood|Adventure, Action|Jon Watts|Tom Holland;Zendaya;Benedict Cumberbatch|8.2',
    'Parasite|2019|Korean|Thriller, Drama|Bong Joon-ho|Song Kang-ho;Lee Sun-kyun;Cho Yeo-jeong|8.5',
    'The Godfather|1972|Hollywood|Crime, Drama|Francis Ford Coppola|Marlon Brando;Al Pacino;James Caan|9.2',
    'Pulp Fiction|1994|Hollywood|Crime, Drama|Quentin Tarantino|John Travolta;Samuel L. Jackson;Uma Thurman|8.9',
    'Fight Club|1999|Hollywood|Drama|David Fincher|Brad Pitt;Edward Norton;Helena Bonham Carter|8.8',
    'The Matrix|1999|Hollywood|Sci-Fi, Action|The Wachowskis|Keanu Reeves;Laurence Fishburne;Carrie-Anne Moss|8.7',
    'Gladiator|2000|Hollywood|Action, Drama|Ridley Scott|Russell Crowe;Joaquin Phoenix;Connie Nielsen|8.5',
    'Whiplash|2014|Hollywood|Drama, Music|Damien Chazelle|Miles Teller;J.K. Simmons;Melissa Benoist|8.5',
    'La La Land|2016|Hollywood|Romance, Drama|Damien Chazelle|Ryan Gosling;Emma Stone;John Legend|8.0',
    'Mad Max: Fury Road|2015|Hollywood|Action, Adventure|George Miller|Tom Hardy;Charlize Theron;Nicholas Hoult|8.1',
    'Blade Runner 2049|2017|Hollywood|Sci-Fi, Drama|Denis Villeneuve|Ryan Gosling;Harrison Ford;Ana de Armas|8.0',
    'Arrival|2016|Hollywood|Sci-Fi, Drama|Denis Villeneuve|Amy Adams;Jeremy Renner;Forest Whitaker|7.9',
    'Joker|2019|Hollywood|Thriller, Drama|Todd Phillips|Joaquin Phoenix;Robert De Niro;Zazie Beetz|8.4',
    'The Prestige|2006|Hollywood|Thriller, Drama|Christopher Nolan|Christian Bale;Hugh Jackman;Scarlett Johansson|8.5',
    'The Lord of the Rings: The Fellowship of the Ring|2001|Hollywood|Adventure, Fantasy|Peter Jackson|Elijah Wood;Ian McKellen;Viggo Mortensen|8.8',
    'The Lord of the Rings: The Two Towers|2002|Hollywood|Adventure, Fantasy|Peter Jackson|Elijah Wood;Ian McKellen;Viggo Mortensen|8.8',
    'The Lord of the Rings: The Return of the King|2003|Hollywood|Adventure, Fantasy|Peter Jackson|Elijah Wood;Viggo Mortensen;Ian McKellen|9.0',
    'Forrest Gump|1994|Hollywood|Drama, Romance|Robert Zemeckis|Tom Hanks;Robin Wright;Gary Sinise|8.8',
    'The Silence of the Lambs|1991|Hollywood|Thriller, Crime|Jonathan Demme|Jodie Foster;Anthony Hopkins;Scott Glenn|8.6',
    'Get Out|2017|Hollywood|Horror, Thriller|Jordan Peele|Daniel Kaluuya;Allison Williams;LaKeith Stanfield|7.7',
    'Knives Out|2019|Hollywood|Mystery, Comedy|Rian Johnson|Daniel Craig;Ana de Armas;Chris Evans|7.9',
    'The Truman Show|1998|Hollywood|Drama, Comedy|Peter Weir|Jim Carrey;Laura Linney;Ed Harris|8.2',
    'Coco|2017|Hollywood|Animation, Adventure|Lee Unkrich|Anthony Gonzalez;Gael Garcia Bernal;Benjamin Bratt|8.4',
    'Toy Story|1995|Hollywood|Animation, Comedy|John Lasseter|Tom Hanks;Tim Allen;Don Rickles|8.3',
    'The Lion King|1994|Hollywood|Animation, Adventure|Roger Allers|Matthew Broderick;James Earl Jones;Jeremy Irons|8.5',
    'Everything Everywhere All at Once|2022|Hollywood|Sci-Fi, Comedy|Daniels|Michelle Yeoh;Ke Huy Quan;Stephanie Hsu|7.8',
    'The Batman|2022|Hollywood|Action, Crime|Matt Reeves|Robert Pattinson;Zoe Kravitz;Paul Dano|7.8',
    'John Wick|2014|Hollywood|Action, Thriller|Chad Stahelski|Keanu Reeves;Michael Nyqvist;Alfie Allen|7.4',
    'John Wick: Chapter 4|2023|Hollywood|Action, Thriller|Chad Stahelski|Keanu Reeves;Donnie Yen;Bill Skarsgard|7.7',
    'Avengers: Endgame|2019|Hollywood|Action, Adventure|Anthony Russo|Robert Downey Jr.;Chris Evans;Scarlett Johansson|8.4',
    'Avengers: Infinity War|2018|Hollywood|Action, Adventure|Anthony Russo|Robert Downey Jr.;Chris Hemsworth;Josh Brolin|8.4',
    'The Social Network|2010|Hollywood|Drama, Biography|David Fincher|Jesse Eisenberg;Andrew Garfield;Justin Timberlake|7.8',
    'Titanic|1997|Hollywood|Romance, Drama|James Cameron|Leonardo DiCaprio;Kate Winslet;Billy Zane|7.9',
    'Avatar|2009|Hollywood|Sci-Fi, Adventure|James Cameron|Sam Worthington;Zoe Saldana;Sigourney Weaver|7.9',
    'Avatar: The Way of Water|2022|Hollywood|Sci-Fi, Adventure|James Cameron|Sam Worthington;Zoe Saldana;Kate Winslet|7.6',
    'Black Panther|2018|Hollywood|Action, Adventure|Ryan Coogler|Chadwick Boseman;Michael B. Jordan;Lupita Nyongo|7.3',
    'Mission: Impossible - Fallout|2018|Hollywood|Action, Thriller|Christopher McQuarrie|Tom Cruise;Henry Cavill;Rebecca Ferguson|7.7',
    'Mission: Impossible - Dead Reckoning|2023|Hollywood|Action, Thriller|Christopher McQuarrie|Tom Cruise;Hayley Atwell;Ving Rhames|7.7',
    'The Martian|2015|Hollywood|Sci-Fi, Adventure|Ridley Scott|Matt Damon;Jessica Chastain;Chiwetel Ejiofor|8.0',
    'Logan|2017|Hollywood|Action, Drama|James Mangold|Hugh Jackman;Patrick Stewart;Dafne Keen|8.1',
    'Prisoners|2013|Hollywood|Thriller, Crime|Denis Villeneuve|Hugh Jackman;Jake Gyllenhaal;Paul Dano|8.2',
    'Se7en|1995|Hollywood|Thriller, Crime|David Fincher|Brad Pitt;Morgan Freeman;Gwyneth Paltrow|8.6',
    'Django Unchained|2012|Hollywood|Western, Drama|Quentin Tarantino|Jamie Foxx;Christoph Waltz;Leonardo DiCaprio|8.5',
    'Inglourious Basterds|2009|Hollywood|War, Drama|Quentin Tarantino|Brad Pitt;Christoph Waltz;Melanie Laurent|8.4',
    'No Country for Old Men|2007|Hollywood|Thriller, Crime|Coen Brothers|Tommy Lee Jones;Javier Bardem;Josh Brolin|8.2',
    'Ford v Ferrari|2019|Hollywood|Drama, Sports|James Mangold|Matt Damon;Christian Bale;Jon Bernthal|8.1',
    'The Departed|2006|Hollywood|Crime, Thriller|Martin Scorsese|Leonardo DiCaprio;Matt Damon;Jack Nicholson|8.5',
    'Shutter Island|2010|Hollywood|Thriller, Mystery|Martin Scorsese|Leonardo DiCaprio;Mark Ruffalo;Ben Kingsley|8.2',
    'Gone Girl|2014|Hollywood|Thriller, Drama|David Fincher|Ben Affleck;Rosamund Pike;Neil Patrick Harris|8.1',
    'Edge of Tomorrow|2014|Hollywood|Sci-Fi, Action|Doug Liman|Tom Cruise;Emily Blunt;Bill Paxton|7.9',
    'The Grand Budapest Hotel|2014|Hollywood|Comedy, Drama|Wes Anderson|Ralph Fiennes;Tony Revolori;Saoirse Ronan|8.1',
    'The Wolf of Wall Street|2013|Hollywood|Comedy, Drama|Martin Scorsese|Leonardo DiCaprio;Jonah Hill;Margot Robbie|8.2',
    'Once Upon a Time in Hollywood|2019|Hollywood|Comedy, Drama|Quentin Tarantino|Leonardo DiCaprio;Brad Pitt;Margot Robbie|7.6',
    'The Revenant|2015|Hollywood|Adventure, Drama|Alejandro G. Inarritu|Leonardo DiCaprio;Tom Hardy;Domhnall Gleeson|8.0',
    'The Irishman|2019|Hollywood|Crime, Drama|Martin Scorsese|Robert De Niro;Al Pacino;Joe Pesci|7.8',
    'Dune: Part Two|2024|Hollywood|Sci-Fi, Adventure|Denis Villeneuve|Timothee Chalamet;Zendaya;Rebecca Ferguson|8.5',
    'Civil War|2024|Hollywood|Action, Drama|Alex Garland|Kirsten Dunst;Cailee Spaeny;Wagner Moura|7.0',
    'The Fall Guy|2024|Hollywood|Action, Comedy|David Leitch|Ryan Gosling;Emily Blunt;Aaron Taylor-Johnson|7.0',
    'Godzilla Minus One|2023|International|Sci-Fi, Drama|Takashi Yamazaki|Ryunosuke Kamiki;Minami Hamabe;Yuki Yamada|7.8',
    'Train to Busan|2016|Korean|Horror, Action|Yeon Sang-ho|Gong Yoo;Jung Yu-mi;Ma Dong-seok|7.6',
    'Oldboy|2003|Korean|Thriller, Mystery|Park Chan-wook|Choi Min-sik;Yoo Ji-tae;Kang Hye-jung|8.3',
    'Decision to Leave|2022|Korean|Mystery, Romance|Park Chan-wook|Tang Wei;Park Hae-il;Lee Jung-hyun|7.3',
    'Memories of Murder|2003|Korean|Crime, Drama|Bong Joon-ho|Song Kang-ho;Kim Sang-kyung;Kim Roi-ha|8.1',
    '3 Idiots|2009|Bollywood|Comedy, Drama|Rajkumar Hirani|Aamir Khan;R. Madhavan;Sharman Joshi|8.4',
    'Dangal|2016|Bollywood|Sports, Drama|Nitesh Tiwari|Aamir Khan;Fatima Sana Shaikh;Sanya Malhotra|8.3',
    'Zindagi Na Milegi Dobara|2011|Bollywood|Adventure, Drama|Zoya Akhtar|Hrithik Roshan;Farhan Akhtar;Abhay Deol|8.2',
    'Bajrangi Bhaijaan|2015|Bollywood|Drama, Adventure|Kabir Khan|Salman Khan;Harshaali Malhotra;Nawazuddin Siddiqui|8.1',
    'Gully Boy|2019|Bollywood|Music, Drama|Zoya Akhtar|Ranveer Singh;Alia Bhatt;Siddhant Chaturvedi|7.9',
    'Pathaan|2023|Bollywood|Action, Thriller|Siddharth Anand|Shah Rukh Khan;Deepika Padukone;John Abraham|5.8',
    'Jawan|2023|Bollywood|Action, Thriller|Atlee|Shah Rukh Khan;Nayanthara;Vijay Sethupathi|7.0',
    'Dunki|2023|Bollywood|Comedy, Drama|Rajkumar Hirani|Shah Rukh Khan;Taapsee Pannu;Vicky Kaushal|6.5',
    'Animal|2023|Bollywood|Action, Crime|Sandeep Reddy Vanga|Ranbir Kapoor;Rashmika Mandanna;Anil Kapoor|6.2',
    'Rocky Aur Rani Kii Prem Kahaani|2023|Bollywood|Romance, Comedy|Karan Johar|Ranveer Singh;Alia Bhatt;Dharmendra|6.8',
    'Fighter|2024|Bollywood|Action, Drama|Siddharth Anand|Hrithik Roshan;Deepika Padukone;Anil Kapoor|6.7',
    'Crew|2024|Bollywood|Comedy, Drama|Rajesh A Krishnan|Tabu;Kareena Kapoor Khan;Kriti Sanon|6.4',
    'Shaitaan|2024|Bollywood|Horror, Thriller|Vikas Bahl|Ajay Devgn;R. Madhavan;Jyothika|6.6',
    'Article 370|2024|Bollywood|Action, Drama|Aditya Suhas Jambhale|Yami Gautam;Priyamani;Arun Govil|7.8',
    'Maharaj|2024|Bollywood|Drama, History|Siddharth P. Malhotra|Junaid Khan;Jaideep Ahlawat;Shalini Pandey|6.7',
    'Kill|2024|Bollywood|Action, Thriller|Nikhil Nagesh Bhat|Lakshya;Raghav Juyal;Tanya Maniktala|7.6',
    'Lapataa Ladies|2024|Bollywood|Comedy, Drama|Kiran Rao|Nitanshi Goel;Pratibha Ranta;Sparsh Shrivastava|8.4',
    'Stree 2|2024|Bollywood|Comedy, Horror|Amar Kaushik|Shraddha Kapoor;Rajkummar Rao;Pankaj Tripathi|7.1',
    'Bhool Bhulaiyaa 3|2024|Bollywood|Comedy, Horror|Anees Bazmee|Kartik Aaryan;Vidya Balan;Triptii Dimri|6.0',
    'Jigra|2024|Bollywood|Action, Drama|Vasan Bala|Alia Bhatt;Vedang Raina;Manoj Pahwa|6.9',
    'Chhaava|2025|Bollywood|Historical, Drama|Laxman Utekar|Vicky Kaushal;Rashmika Mandanna;Akshaye Khanna|7.4',
    'Saiyaara|2025|Bollywood|Romance, Drama|Mohit Suri|Ahaan Panday;Aneet Padda;Varun Badola|6.9',
    'Sky Force|2025|Bollywood|Action, War|Sandeep Kewlani|Akshay Kumar;Veer Pahariya;Sara Ali Khan|6.4',
    'Deva|2025|Bollywood|Action, Thriller|Rosshan Andrrews|Shahid Kapoor;Pooja Hegde;Pavail Gulati|6.3',
    'Sitaare Zameen Par|2025|Bollywood|Drama, Family|R. S. Prasanna|Aamir Khan;Genelia Dsouza;Darsheel Safary|7.1',
    'Housefull 5|2025|Bollywood|Comedy|Tarun Mansukhani|Akshay Kumar;Riteish Deshmukh;Abhishek Bachchan|5.7',
    'The Diplomat|2025|Bollywood|Thriller, Drama|Shivam Nair|John Abraham;Sadia Khateeb;Kumud Mishra|6.5',
    'Maa|2025|Bollywood|Horror, Drama|Vishal Furia|Kajol;Ronit Roy;Indraneil Sengupta|6.0',
    'Metro... In Dino|2025|Bollywood|Romance, Drama|Anurag Basu|Sara Ali Khan;Aditya Roy Kapur;Anupam Kher|6.7',
    'Andhadhun|2018|Bollywood|Crime, Thriller|Sriram Raghavan|Ayushmann Khurrana;Tabu;Radhika Apte|8.2'
].map(line => parseEntry(line, 'Movie'));

const tvCatalog = [
    'Breaking Bad|2008|Hollywood|Crime, Drama|Vince Gilligan|Bryan Cranston;Aaron Paul;Anna Gunn|9.5',
    'Game of Thrones|2011|Hollywood|Fantasy, Drama|David Benioff & D. B. Weiss|Emilia Clarke;Kit Harington;Peter Dinklage|9.2',
    'Stranger Things|2016|Hollywood|Sci-Fi, Horror|The Duffer Brothers|Millie Bobby Brown;Finn Wolfhard;David Harbour|8.7',
    'The Last of Us|2023|Hollywood|Drama, Thriller|Craig Mazin & Neil Druckmann|Pedro Pascal;Bella Ramsey;Anna Torv|8.7',
    'Dark|2017|International|Sci-Fi, Mystery|Baran bo Odar|Louis Hofmann;Lisa Vicari;Maja Schone|8.7',
    'Wednesday|2022|Hollywood|Fantasy, Mystery|Tim Burton|Jenna Ortega;Emma Myers;Gwendoline Christie|8.0',
    'Better Call Saul|2015|Hollywood|Crime, Drama|Vince Gilligan & Peter Gould|Bob Odenkirk;Rhea Seehorn;Jonathan Banks|9.0',
    'The Bear|2022|Hollywood|Comedy, Drama|Christopher Storer|Jeremy Allen White;Ayo Edebiri;Ebon Moss-Bachrach|8.5',
    'The Crown|2016|Hollywood|Drama, History|Peter Morgan|Claire Foy;Olivia Colman;Imelda Staunton|8.6',
    'Chernobyl|2019|Hollywood|Drama, History|Craig Mazin|Jared Harris;Stellan Skarsgard;Emily Watson|9.3',
    'The Office|2005|Hollywood|Comedy|Greg Daniels|Steve Carell;John Krasinski;Jenna Fischer|9.0',
    'Friends|1994|Hollywood|Comedy, Romance|David Crane & Marta Kauffman|Jennifer Aniston;Courteney Cox;Matt LeBlanc|8.9',
    'Sherlock|2010|Hollywood|Crime, Mystery|Mark Gatiss & Steven Moffat|Benedict Cumberbatch;Martin Freeman;Andrew Scott|9.1',
    'House of the Dragon|2022|Hollywood|Fantasy, Drama|Ryan Condal|Emma DArcy;Matt Smith;Olivia Cooke|8.3',
    'The Boys|2019|Hollywood|Action, Comedy|Eric Kripke|Karl Urban;Jack Quaid;Antony Starr|8.7',
    'Money Heist|2017|International|Crime, Thriller|Alex Pina|Alvaro Morte;Itziar Ituno;Pedro Alonso|8.2',
    'Narcos|2015|Hollywood|Crime, Drama|Chris Brancato|Wagner Moura;Pedro Pascal;Boyd Holbrook|8.7',
    'Peaky Blinders|2013|International|Crime, Drama|Steven Knight|Cillian Murphy;Paul Anderson;Sophie Rundle|8.7',
    'Succession|2018|Hollywood|Drama|Jesse Armstrong|Brian Cox;Jeremy Strong;Sarah Snook|8.8',
    'True Detective|2014|Hollywood|Crime, Mystery|Nic Pizzolatto|Matthew McConaughey;Woody Harrelson;Jodie Foster|8.9',
    'Black Mirror|2011|International|Sci-Fi, Thriller|Charlie Brooker|Daniel Lapaine;Bryce Dallas Howard;Jesse Plemons|8.7',
    'The Mandalorian|2019|Hollywood|Sci-Fi, Adventure|Jon Favreau|Pedro Pascal;Katee Sackhoff;Carl Weathers|8.6',
    'Loki|2021|Hollywood|Sci-Fi, Fantasy|Michael Waldron|Tom Hiddleston;Sophia Di Martino;Owen Wilson|8.2',
    'WandaVision|2021|Hollywood|Sci-Fi, Drama|Jac Schaeffer|Elizabeth Olsen;Paul Bettany;Kathryn Hahn|7.9',
    'Daredevil|2015|Hollywood|Action, Crime|Drew Goddard|Charlie Cox;Vincent DOnofrio;Deborah Ann Woll|8.6',
    'Reacher|2022|Hollywood|Action, Thriller|Nick Santora|Alan Ritchson;Maria Sten;Malcolm Goodwin|8.0',
    'Squid Game|2021|Korean|Thriller, Drama|Hwang Dong-hyuk|Lee Jung-jae;Jung Ho-yeon;Wi Ha-joon|8.0',
    'Crash Landing on You|2019|Korean|Romance, Drama|Lee Jeong-hyo|Hyun Bin;Son Ye-jin;Seo Ji-hye|8.7',
    'Goblin|2016|Korean|Fantasy, Romance|Lee Eung-bok|Gong Yoo;Kim Go-eun;Lee Dong-wook|8.6',
    'Vincenzo|2021|Korean|Crime, Dark Comedy|Kim Hee-won|Song Joong-ki;Jeon Yeo-been;Ok Taec-yeon|8.4',
    'Extraordinary Attorney Woo|2022|Korean|Drama, Legal|Yoo In-shik|Park Eun-bin;Kang Tae-oh;Kang Ki-young|8.6',
    'Itaewon Class|2020|Korean|Drama, Romance|Kim Sung-yoon|Park Seo-joon;Kim Da-mi;Yoo Jae-myung|8.2',
    'Kingdom|2019|Korean|Historical, Thriller|Kim Seong-hun|Ju Ji-hoon;Bae Doona;Ryu Seung-ryong|8.3',
    'Reply 1988|2015|Korean|Comedy, Drama|Shin Won-ho|Lee Hye-ri;Park Bo-gum;Ryu Jun-yeol|9.0',
    'My Mister|2018|Korean|Drama|Kim Won-seok|Lee Sun-kyun;IU;Park Ho-san|9.1',
    'Hospital Playlist|2020|Korean|Drama, Comedy|Shin Won-ho|Jo Jung-suk;Yoo Yeon-seok;Jung Kyung-ho|8.8',
    'Twenty-Five Twenty-One|2022|Korean|Romance, Drama|Jung Ji-hyun|Kim Tae-ri;Nam Joo-hyuk;Bona|8.6',
    'Descendants of the Sun|2016|Korean|Romance, Drama|Lee Eung-bok|Song Joong-ki;Song Hye-kyo;Jin Goo|8.2',
    'All of Us Are Dead|2022|Korean|Horror, Thriller|Lee Jae-kyoo|Park Ji-hu;Yoon Chan-young;Cho Yi-hyun|7.5',
    'Mr. Sunshine|2018|Korean|Historical, Romance|Lee Eung-bok|Lee Byung-hun;Kim Tae-ri;Yoo Yeon-seok|8.7',
    'Business Proposal|2022|Korean|Romance, Comedy|Park Seon-ho|Ahn Hyo-seop;Kim Se-jeong;Kim Min-kyu|8.1',
    'Hometown Cha-Cha-Cha|2021|Korean|Romance, Comedy|Yoo Je-won|Shin Min-a;Kim Seon-ho;Lee Sang-yi|8.4',
    'The Glory|2022|Korean|Drama, Thriller|Ahn Gil-ho|Song Hye-kyo;Lee Do-hyun;Lim Ji-yeon|8.1',
    'Queen of Tears|2024|Korean|Romance, Drama|Jang Young-woo|Kim Soo-hyun;Kim Ji-won;Park Sung-hoon|8.2',
    'Marry My Husband|2024|Korean|Fantasy, Romance|Park Won-gook|Park Min-young;Na In-woo;Lee Yi-kyung|7.9',
    'Lovely Runner|2024|Korean|Fantasy, Romance|Yoon Jong-ho|Byeon Woo-seok;Kim Hye-yoon;Song Geon-hee|8.7',
    'Signal|2016|Korean|Crime, Thriller|Kim Won-seok|Lee Je-hoon;Kim Hye-soo;Cho Jin-woong|8.5',
    'Mouse|2021|Korean|Crime, Thriller|Choi Joon-bae|Lee Seung-gi;Lee Hee-joon;Park Ju-hyun|8.6',
    'Flower of Evil|2020|Korean|Thriller, Romance|Kim Cheol-kyu|Lee Joon-gi;Moon Chae-won;Jang Hee-jin|8.5',
    'The Uncanny Counter|2020|Korean|Fantasy, Action|Yoo Sun-dong|Jo Byeong-kyu;Yoo Jun-sang;Kim Se-jeong|8.0',
    'Alice in Borderland|2020|International|Sci-Fi, Thriller|Shinsuke Sato|Kento Yamazaki;Tao Tsuchiya;Nijiro Murakami|7.7',
    'One Piece|2023|Hollywood|Adventure, Fantasy|Matt Owens|Inaki Godoy;Emily Rudd;Mackenyu|8.4',
    'The Queens Gambit|2020|Hollywood|Drama|Scott Frank|Anya Taylor-Joy;Thomas Brodie-Sangster;Harry Melling|8.5',
    'Severance|2022|Hollywood|Sci-Fi, Thriller|Dan Erickson|Adam Scott;Britt Lower;Patricia Arquette|8.7',
    'Shogun|2024|Hollywood|Drama, History|Rachel Kondo & Justin Marks|Hiroyuki Sanada;Anna Sawai;Cosmo Jarvis|8.7',
    'The White Lotus|2021|Hollywood|Comedy, Drama|Mike White|Jennifer Coolidge;Aubrey Plaza;Theo James|8.0',
    'Abbott Elementary|2021|Hollywood|Comedy|Quinta Brunson|Quinta Brunson;Tyler James Williams;Janelle James|8.2',
    'Euphoria|2019|Hollywood|Drama|Sam Levinson|Zendaya;Hunter Schafer;Sydney Sweeney|8.3',
    'The Wire|2002|Hollywood|Crime, Drama|David Simon|Dominic West;Idris Elba;Michael K. Williams|9.3',
    'The Sopranos|1999|Hollywood|Crime, Drama|David Chase|James Gandolfini;Lorraine Bracco;Edie Falco|9.2',
    'Mindhunter|2017|Hollywood|Crime, Thriller|Joe Penhall|Jonathan Groff;Holt McCallany;Anna Torv|8.6',
    'Ozark|2017|Hollywood|Crime, Drama|Bill Dubuque|Jason Bateman;Laura Linney;Julia Garner|8.5',
    'House|2004|Hollywood|Drama, Medical|David Shore|Hugh Laurie;Omar Epps;Robert Sean Leonard|8.7',
    'Brooklyn Nine-Nine|2013|Hollywood|Comedy, Crime|Dan Goor|Andy Samberg;Melissa Fumero;Andre Braugher|8.4',
    'Modern Family|2009|Hollywood|Comedy|Christopher Lloyd|Ed ONeill;Sofia Vergara;Ty Burrell|8.5',
    'How I Met Your Mother|2005|Hollywood|Comedy, Romance|Carter Bays|Josh Radnor;Neil Patrick Harris;Cobie Smulders|8.3',
    'Parks and Recreation|2009|Hollywood|Comedy|Greg Daniels|Amy Poehler;Nick Offerman;Aubrey Plaza|8.6',
    'Ted Lasso|2020|Hollywood|Comedy, Drama|Jason Sudeikis|Jason Sudeikis;Hannah Waddingham;Brett Goldstein|8.8',
    'Yellowstone|2018|Hollywood|Drama, Western|Taylor Sheridan|Kevin Costner;Kelly Reilly;Luke Grimes|8.7',
    'Fallout|2024|Hollywood|Sci-Fi, Adventure|Geneva Robertson-Dworet|Ella Purnell;Aaron Moten;Walton Goggins|8.3',
    'Arcane|2021|Hollywood|Animation, Action|Christian Linke|Hailee Steinfeld;Ella Purnell;Kevin Alejandro|9.0',
    'Blue Eye Samurai|2023|Hollywood|Animation, Action|Michael Green|Maya Erskine;Masi Oka;Brenda Song|8.7',
    'Ripley|2024|Hollywood|Crime, Drama|Steven Zaillian|Andrew Scott;Dakota Fanning;Johnny Flynn|8.1',
    'Baby Reindeer|2024|International|Drama, Thriller|Richard Gadd|Richard Gadd;Jessica Gunning;Nava Mau|7.8',
    'Mr. Robot|2015|Hollywood|Thriller, Drama|Sam Esmail|Rami Malek;Christian Slater;Carly Chaikin|8.5',
    'The Night Of|2016|Hollywood|Crime, Drama|Steven Zaillian|Riz Ahmed;John Turturro;Bill Camp|8.4',
    'Fargo|2014|Hollywood|Crime, Drama|Noah Hawley|Billy Bob Thornton;Martin Freeman;Juno Temple|8.8',
    'The Penguin|2024|Hollywood|Crime, Drama|Lauren LeFranc|Colin Farrell;Cristin Milioti;Rhenzy Feliz|8.7',
    'Andor|2022|Hollywood|Sci-Fi, Thriller|Tony Gilroy|Diego Luna;Stellan Skarsgard;Adria Arjona|8.4',
    'Ahsoka|2023|Hollywood|Sci-Fi, Adventure|Dave Filoni|Rosario Dawson;Natasha Liu Bordizzo;Mary Elizabeth Winstead|7.5',
    'The Walking Dead|2010|Hollywood|Horror, Drama|Frank Darabont|Andrew Lincoln;Norman Reedus;Melissa McBride|8.1',
    'The Handmaids Tale|2017|Hollywood|Drama, Sci-Fi|Bruce Miller|Elisabeth Moss;Yvonne Strahovski;Ann Dowd|8.3',
    'Lupin|2021|International|Crime, Mystery|George Kay|Omar Sy;Ludivine Sagnier;Clotilde Hesme|7.5',
    'Berlin|2023|International|Crime, Thriller|Esther Martinez Lobato|Pedro Alonso;Michelle Jenner;Tristan Ulloa|7.0',
    'The Sandman|2022|Hollywood|Fantasy, Drama|Allan Heinberg|Tom Sturridge;Boyd Holbrook;Kirby Howell-Baptiste|7.7',
    'Kaala Paani|2023|Indian|Thriller, Drama|Sameer Saxena|Ashutosh Gowariker;Mona Singh;Sukant Goel|8.0',
    'Sacred Games|2018|Indian|Crime, Thriller|Anurag Kashyap|Saif Ali Khan;Nawazuddin Siddiqui;Radhika Apte|8.5',
    'Mirzapur|2018|Indian|Crime, Thriller|Karan Anshuman|Pankaj Tripathi;Ali Fazal;Divyenndu|8.4',
    'Paatal Lok|2020|Indian|Crime, Thriller|Avinash Arun|Jaideep Ahlawat;Gul Panag;Neeraj Kabi|8.1',
    'The Family Man|2019|Indian|Action, Thriller|Raj & DK|Manoj Bajpayee;Priyamani;Sharib Hashmi|8.7',
    'Panchayat|2020|Indian|Comedy, Drama|Deepak Kumar Mishra|Jitendra Kumar;Neena Gupta;Raghubir Yadav|9.0',
    'Farzi|2023|Indian|Crime, Thriller|Raj & DK|Shahid Kapoor;Vijay Sethupathi;Raashii Khanna|8.4',
    'Heeramandi|2024|Indian|Drama, History|Sanjay Leela Bhansali|Manisha Koirala;Sonakshi Sinha;Aditi Rao Hydari|6.3',
    'Delhi Crime|2019|Indian|Crime, Drama|Richie Mehta|Shefali Shah;Rasika Dugal;Rajesh Tailang|8.5',
    'Kota Factory|2019|Indian|Drama|Raghav Subbu|Mayur More;Jitendra Kumar;Ranjan Raj|9.0',
    'Guns & Gulaabs|2023|Indian|Crime, Comedy|Raj & DK|Rajkummar Rao;Dulquer Salmaan;Gulshan Devaiah|7.7',
    'Asur|2020|Indian|Crime, Thriller|Oni Sen|Arshad Warsi;Barun Sobti;Anupriya Goenka|8.5',
    'Rana Naidu|2023|Indian|Crime, Drama|Karan Anshuman|Rana Daggubati;Venkatesh Daggubati;Surveen Chawla|7.1',
    'Made in Heaven|2019|Indian|Drama, Romance|Zoya Akhtar|Sobhita Dhulipala;Arjun Mathur;Kalki Koechlin|8.2',
    'Special OPS|2020|Indian|Action, Thriller|Neeraj Pandey|Kay Kay Menon;Karan Tacker;Vinay Pathak|8.6'
].map(line => parseEntry(line, 'TV Series'));

const existingMovieKeys = new Set(movieCatalog.map(movie => `${movie.title.toLowerCase()}::${movie.year}`));

const animationMovies = animationCatalog
    .filter(entry => !existingMovieKeys.has(`${entry.title.toLowerCase()}::${entry.year}`))
    .slice(0, 100)
    .map(entry => createEntry({
        ...entry,
        type: 'Movie',
        cast: Array.isArray(entry.cast) ? entry.cast : [],
        director: entry.director || 'Director not listed',
        imdbRating: Number(entry.imdbRating) || 7.0
    }));

const indiaCinemaMovies = indiaCinemaCatalog
    .map(line => parseEntry(line, 'Movie'))
    .filter(entry => !existingMovieKeys.has(`${entry.title.toLowerCase()}::${entry.year}`));

const extraMovies = moreMoviesCatalog
    .map(line => parseEntry(line, 'Movie'))
    .filter(entry => !existingMovieKeys.has(`${entry.title.toLowerCase()}::${entry.year}`))
    .filter(entry => !indiaCinemaMovies.some(movie => `${movie.title.toLowerCase()}::${movie.year}` === `${entry.title.toLowerCase()}::${entry.year}`));

const movies = [...movieCatalog, ...animationMovies, ...indiaCinemaMovies, ...extraMovies, ...tvCatalog];

const seedDB = async () => {
    await Movie.deleteMany({});
    await Movie.insertMany(movies);
    console.log(`Successfully seeded ${movies.length} titles.`);
    console.log(`Movies: ${movieCatalog.length + animationMovies.length + indiaCinemaMovies.length + extraMovies.length}, TV Series: ${tvCatalog.length}`);
    console.log(`Animation additions: ${animationMovies.length}`);
    console.log(`Indian cinema additions: ${indiaCinemaMovies.length}`);
    console.log(`Additional mixed movies: ${extraMovies.length}`);
};

seedDB()
    .then(() => mongoose.connection.close())
    .catch(err => {
        console.log('Seeding Error:', err);
        mongoose.connection.close();
    });
